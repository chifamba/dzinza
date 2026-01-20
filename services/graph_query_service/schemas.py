import strawberry
from typing import List, Optional
import datetime

@strawberry.scalar(description="Date scalar")
class Date:
    @staticmethod
    def serialize(dt: datetime.date) -> str:
        return dt.isoformat()

    @staticmethod
    def parse_value(value: str) -> datetime.date:
        return datetime.date.fromisoformat(value)

@strawberry.type
class Node:
    id: str
    name: str
    type: str  # PERSON or RELATIONSHIP

@strawberry.type
class Edge:
    from_id: str
    to_id: str
    relationship_type: str

@strawberry.type
class GraphTraversalResult:
    nodes: List[Node]
    edges: List[Edge]

import threading

_graph_cache = {}
_graph_cache_lock = threading.Lock()

@strawberry.type
class Query:
    @strawberry.field
    def schema_version(self) -> str:
        return "1.0.0"

    @strawberry.field
    def traverse_graph(
        self,
        start_person_id: str,
        depth: int,
        direction: str
    ) -> GraphTraversalResult:
        cache_key = (start_person_id, depth, direction)
        with _graph_cache_lock:
            if cache_key in _graph_cache:
                return _graph_cache[cache_key]
        from .models import get_neo4j_driver
        driver = get_neo4j_driver()
        nodes = []
        edges = []
        with driver.session() as session:
            cypher = (
                "MATCH (start:Person {id: $start_id})"
                " CALL apoc.path.subgraphAll(start, {maxLevel: $depth, relationshipFilter: $rel_dir}) YIELD nodes, relationships"
                " RETURN nodes, relationships"
            )
            rel_dir = (
                ">" if direction == "DESCENDANTS"
                else "<" if direction == "ANCESTORS"
                else "<>"
            )
            result = session.run(
                cypher,
                start_id=start_person_id,
                depth=depth,
                rel_dir=rel_dir
            )
            record = result.single()
            if record:
                for n in record["nodes"]:
                    nodes.append(Node(
                        id=n.get("id", ""),
                        name=n.get("name", ""),
                        type="PERSON" if n.labels and "Person" in n.labels else "RELATIONSHIP"
                    ))
                for r in record["relationships"]:
                    edges.append(Edge(
                        from_id=r.start_node.get("id", ""),
                        to_id=r.end_node.get("id", ""),
                        relationship_type=r.type
                    ))
        result_obj = GraphTraversalResult(
            nodes=nodes,
            edges=edges
        )
        with _graph_cache_lock:
            _graph_cache[cache_key] = result_obj
        return result_obj

    hello: str = "Hello from Graph Query Service"
