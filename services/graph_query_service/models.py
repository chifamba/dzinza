"""Data models for graph_query_service service."""

from neo4j import GraphDatabase
import os

def get_neo4j_driver():
    from .config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
    return GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
