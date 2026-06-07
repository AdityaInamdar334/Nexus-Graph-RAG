import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Next.js requires dynamic import for client-side canvas libraries
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface GraphViewerProps {
  graphData: any;
  onNodeClick?: (nodeName: string) => void;
}

export default function GraphViewer({ graphData, onNodeClick }: GraphViewerProps) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Use ResizeObserver to reliably measure container even when unhidden
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect.width > 0) {
          setDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Apply custom D3 forces once the graph is mounted
  useEffect(() => {
    try {
      if (fgRef.current && typeof fgRef.current.d3Force === 'function') {
        const charge = fgRef.current.d3Force('charge');
        if (charge) charge.strength(-400);
        
        const link = fgRef.current.d3Force('link');
        if (link) link.distance(80);
      }
    } catch (e) {
      console.warn("Failed to apply custom D3 forces:", e);
    }
  }, [dimensions.width]);

  const gData = useMemo(() => {
    if (!graphData?.nodes || !graphData?.links) return { nodes: [], links: [] };
    
    const nodes = graphData.nodes.map((n: any) => ({
      id: n.id,
      name: n.name || n.id,
      type: n.type || 'Unknown',
      color: getNodeColor(n.type),
    }));
    
    const links = graphData.links.map((l: any) => ({
      source: l.source,
      target: l.target,
      label: l.type,
    }));
    
    return { nodes, links };
  }, [graphData]);

  function getNodeColor(type: string) {
    // A nice glowing palette for different entity types
    const typeMap: Record<string, string> = {
      'Person': '#14b8a6',       // Teal
      'Organization': '#3b82f6', // Blue
      'Location': '#10b981',     // Emerald
      'Concept': '#f43f5e',      // Rose
      'Method': '#f59e0b',       // Amber
      'Paper': '#06b6d4',        // Cyan
      'Project': '#8b5cf6',      // Violet
      'Course': '#ec4899',       // Pink
      'Degree': '#eab308',       // Yellow
    };
    return typeMap[type] || '#9ca3af'; // Gray fallback
  }

  const handleNodeClick = useCallback((node: any) => {
    if (onNodeClick) {
      onNodeClick(node.name);
    }
    
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(4, 1000);
    }
  }, [onNodeClick]);

  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%', backgroundColor: '#050505', display: 'flex' }}>
      {dimensions.width > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={gData}
          nodeLabel="name"
          nodeColor="color"
          linkColor={() => 'rgba(255,255,255,0.15)'}
          linkWidth={1.5}
          // Flowing particles along the links like energy!
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.005}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          onNodeClick={handleNodeClick}
          // Custom render for Obsidian-style nodes (glowing dots with text below)
          nodeCanvasObject={(node: any, ctx: any, globalScale: number) => {
            const label = node.name;
            const fontSize = Math.max(12 / globalScale, 4); // Keep text readable but scale down
            ctx.font = `${fontSize}px Inter, sans-serif`;
            
            // Draw glowing node circle
            const nodeR = Math.max(5, 15 / globalScale);
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeR, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.color;
            ctx.fill();
            
            // Draw subtle glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = node.color;
            ctx.fill();
            ctx.shadowBlur = 0; // Reset shadow
            
            // Draw Text below the node
            const textY = node.y + nodeR + (fontSize / 2) + (4 / globalScale);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Text shadow for readability against lines
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillText(label, node.x, textY);
            ctx.shadowBlur = 0;
          }}

        />
    </div>
  );
}
