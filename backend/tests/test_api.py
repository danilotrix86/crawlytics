import json
import sqlite3

import pytest
from fastapi.testclient import TestClient

from app import app
from parser import DEFAULT_CRAWLER_PATTERNS
from conftest import SAMPLE_LINES

client = TestClient(app)


def sql(query, params=None, limit=1000):
    return client.post("/api/query_sql", json={"query": query, "params": params or [], "limit": limit})


# --- crawler patterns -------------------------------------------------------

def test_patterns_default(patterns_file):
    response = client.get("/api/crawler-patterns")
    assert response.status_code == 200
    assert response.json()["patterns"] == DEFAULT_CRAWLER_PATTERNS


def test_patterns_are_stored_as_data_not_code(patterns_file):
    payload = ['GPTBot', '"]\nimport os; os.system("calc")\nX = ["']
    response = client.post("/api/crawler-patterns", json=payload)
    assert response.status_code == 422  # newline is rejected

    payload = ['GPTBot', '"]; import os #']
    response = client.post("/api/crawler-patterns", json=payload)
    assert response.status_code == 200
    stored = json.loads(patterns_file.read_text(encoding="utf-8"))
    assert stored["patterns"] == payload
    assert client.get("/api/crawler-patterns").json()["patterns"] == payload


def test_patterns_reset(patterns_file):
    client.post("/api/crawler-patterns", json=["OnlyBot"])
    response = client.post("/api/crawler-patterns/reset")
    assert response.status_code == 200
    assert client.get("/api/crawler-patterns").json()["patterns"] == DEFAULT_CRAWLER_PATTERNS


def test_patterns_reject_non_strings(patterns_file):
    assert client.post("/api/crawler-patterns", json=[1, 2]).status_code == 422


# --- SQL endpoint -----------------------------------------------------------

def test_select_works():
    response = sql("SELECT COUNT(*) AS n FROM access_logs")
    assert response.status_code == 200
    assert "n" in response.json()[0]


@pytest.mark.parametrize("query", [
    "DELETE FROM access_logs",
    "SELECT 1; DROP TABLE access_logs",
    "WITH x AS (SELECT 1) DELETE FROM access_logs",
    "SELECT * FROM pragma_table_info('access_logs') UNION SELECT load_extension('x')",
])
def test_writes_are_rejected(query):
    assert sql(query).status_code in (422, 500)
    assert sql("SELECT COUNT(*) AS n FROM access_logs").status_code == 200


@pytest.mark.parametrize("statement", [
    "DELETE FROM access_logs",
    "INSERT INTO log_files (log_file_id, file_name) VALUES ('x', 'y')",
    "ATTACH DATABASE 'other.db' AS other",
    "PRAGMA query_only = OFF",
    "CREATE TABLE t (x)",
])
def test_readonly_connection_blocks_everything_but_reads(statement):
    # Bypasses the keyword check entirely: the connection itself must refuse
    from database import Database
    conn = Database().get_readonly_connection()
    with pytest.raises(sqlite3.DatabaseError):
        conn.execute(statement)
    assert conn.execute("SELECT COUNT(*) FROM access_logs").fetchone() is not None


def test_limit_is_bounded():
    assert sql("SELECT 1", limit=10_000_000).status_code == 422


# --- security middleware ----------------------------------------------------

def test_foreign_origin_gets_no_cors_headers():
    response = client.options(
        "/api/crawler-patterns",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in response.headers


def test_local_origin_is_allowed():
    response = client.options(
        "/api/crawler-patterns",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"},
    )
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_unknown_host_header_is_rejected():
    response = client.get("/health", headers={"Host": "attacker.example"})
    assert response.status_code == 400


# --- routing ----------------------------------------------------------------

def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_unknown_api_route_is_404():
    assert client.get("/api/does-not-exist").status_code == 404


def test_spa_deep_link_serves_index():
    response = client.get("/logs-table")
    assert response.status_code == 200
    assert "<html" in response.text.lower()


def test_no_path_traversal():
    response = client.get("/..%2Fapp.py")
    assert "FastAPI" not in response.text


# --- import flow ------------------------------------------------------------

def test_upload_import_and_query(patterns_file):
    body = ("\n".join(SAMPLE_LINES) + "\n").encode()
    response = client.post("/api/import-log", files={"log_file": ("access.log", body, "text/plain")})
    assert response.status_code == 202
    task_id = response.json()["log_file_id"]

    # TestClient runs background tasks before returning
    task = client.get(f"/api/task/{task_id}").json()
    assert task["status"] == "complete", task
    assert task["records_imported"] == 3
    assert task["issues"] == []

    rows = sql(
        "SELECT crawler_name, request_id FROM access_logs WHERE log_file_id = ? ORDER BY time",
        [task_id],
    ).json()
    assert [r["crawler_name"] for r in rows] == ["GPTBot", "Applebot-Extended", "ClaudeBot"]
    assert rows[2]["request_id"] == "0b9f0a3e-8e4b-4a8e-9a65-1d2f3c4b5a69"

    assert client.get("/api/active-log-file").json()["log_file_id"] == task_id
    deleted = client.delete(f"/api/logs/{task_id}").json()
    assert deleted["deleted_log_entries"] == 3


# --- enrichment -------------------------------------------------------------

def test_crawler_info_table_is_queryable():
    rows = sql("SELECT operator, category FROM crawler_info WHERE crawler_name = 'gptbot'").json()
    assert rows == [{"operator": "OpenAI", "category": "training"}]


def test_import_stores_verdicts_and_backfill_runs(patterns_file):
    body = ("\n".join(SAMPLE_LINES) + "\n").encode()
    task_id = client.post("/api/import-log", files={"log_file": ("a.log", body, "text/plain")}).json()["log_file_id"]

    # Offline in tests: no range lists or GeoIP, so every verdict is "unknown"
    rows = sql("SELECT verification FROM access_logs WHERE log_file_id = ?", [task_id]).json()
    assert {r["verification"] for r in rows} == {"unknown"}

    status_body = client.get(f"/api/enrichment/status?log_file_id={task_id}").json()
    assert status_body["pending_rows"] == 0
    assert "training" in status_body["categories"]

    run = client.post("/api/enrichment/run", json={"log_file_id": task_id, "force": True})
    assert run.status_code == 202
    result = client.get(f"/api/task/{run.json()['task_id']}").json()
    assert result["status"] == "complete", result
    assert result["rows_updated"] == 3

    client.delete(f"/api/logs/{task_id}")


def test_migration_adds_columns_to_old_databases(tmp_path):
    import sqlite3
    from database.init_db import migrate
    conn = sqlite3.connect(tmp_path / "old.db")
    conn.execute("CREATE TABLE access_logs (id INTEGER PRIMARY KEY, ip_address TEXT)")
    migrate(conn)
    columns = {row[1] for row in conn.execute("PRAGMA table_info(access_logs)")}
    assert {"country_code", "asn", "as_org", "verification"} <= columns
