"""Data models for graph_query_service service."""

from neo4j import GraphDatabase
import os

def get_neo4j_driver():
    uri = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "testpassword")
    return GraphDatabase.driver(uri, auth=(user, password))
