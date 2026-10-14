"""Neo4j connection management for Dzinza v2.

Single driver, shared across the app. Connection details come from env vars
(see docker-compose.yml). Retries briefly on startup so the API can boot
before Neo4j finishes initializing.
"""

import logging
import os
import time

from neo4j import Driver, GraphDatabase

log = logging.getLogger("dzinza.db")

_driver: Driver | None = None


def get_driver() -> Driver:
    global _driver
    if _driver is None:
        uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
        user = os.environ.get("NEO4J_USER", "neo4j")
        password = os.environ.get("NEO4J_PASSWORD", "dzinza-dev-password")
        _driver = GraphDatabase.driver(uri, auth=(user, password))
        # Wait for Neo4j to be ready (helpful on `docker compose up` cold start)
        deadline = time.time() + 60
        while True:
            try:
                _driver.verify_connectivity()
                log.info("Connected to Neo4j at %s", uri)
                break
            except Exception as exc:  # noqa: BLE001
                if time.time() > deadline:
                    raise RuntimeError(
                        f"Could not connect to Neo4j at {uri} within 60s"
                    ) from exc
                log.info("Waiting for Neo4j at %s...", uri)
                time.sleep(2)
    return _driver


def close_driver() -> None:
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None