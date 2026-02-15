import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as d3 from 'd3';
import { api } from './api';
import { Person, Relationship } from './types';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  gender: string;
  person: Person;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  type: string;
}

export function FamilyTree() {
  const { id } = useParams<{ id: string }>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  useEffect(() => {
    if (!loading && nodes.length > 0 && svgRef.current) {
      renderGraph();
    }
  }, [loading, nodes, links]);

  const loadData = async (treeId: string) => {
    try {
      setLoading(true);
      const [personsData, relationshipsData] = await Promise.all([
        api.genealogy.getTreePersons(treeId),
        api.genealogy.getTreeRelationships(treeId)
      ]);

      const graphNodes: Node[] = personsData.map(p => ({
        id: p.id,
        name: `${p.primary_name.given_name} ${p.primary_name.surname}`,
        gender: p.gender,
        person: p
      }));

      const graphLinks: Link[] = relationshipsData.map(r => ({
        source: r.person1_id,
        target: r.person2_id,
        type: r.type
      }));

      setNodes(graphNodes);
      setLinks(graphLinks);
    } catch (err: any) {
      setError(err.message || 'Failed to load tree');
    } finally {
      setLoading(false);
    }
  };

  const renderGraph = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const width = 800;
    const height = 600;

    const simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", d => d.type === 'SPOUSE_OF' ? 2 : 1)
      .attr("stroke", d => d.type === 'SPOUSE_OF' ? "red" : "#999");

    const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 20)
      .attr("fill", d => d.gender === 'MALE' ? "#4285F4" : (d.gender === 'FEMALE' ? "#EA4335" : "#34A853"))
      .call(d3.drag<SVGCircleElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    node.append("title")
      .text(d => d.name);

    const labels = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text(d => d.name)
      .attr("font-size", 10)
      .attr("dx", 22)
      .attr("dy", 4);

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as Node).x!)
        .attr("y1", d => (d.source as Node).y!)
        .attr("x2", d => (d.target as Node).x!)
        .attr("y2", d => (d.target as Node).y!);

      node
        .attr("cx", d => d.x!)
        .attr("cy", d => d.y!);
      
      labels
        .attr("x", d => d.x!)
        .attr("y", d => d.y!);
    });

    function dragstarted(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  };

  if (loading) return <div>Loading tree...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="container">
      <h2>Family Tree Visualization</h2>
      <svg ref={svgRef} width={800} height={600} style={{ border: '1px solid #ccc', background: '#fff' }}></svg>
      <div className="legend" style={{ marginTop: '10px' }}>
        <span style={{ color: '#4285F4' }}>● Male</span>
        <span style={{ color: '#EA4335', marginLeft: '10px' }}>● Female</span>
        <span style={{ color: '#34A853', marginLeft: '10px' }}>● Other</span>
        <span style={{ color: 'red', marginLeft: '10px' }}>— Spouse</span>
        <span style={{ color: '#999', marginLeft: '10px' }}>— Parent/Child</span>
      </div>
    </div>
  );
}
