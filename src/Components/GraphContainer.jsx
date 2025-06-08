"use client";

import { Toaster } from "react-hot-toast";
import {
  Button,
  IconButton,
  Tooltip,
  Divider,
  Typography,
  Box,
} from "@mui/material";

import {
  PlayArrow,
  Pause,
  Undo,
  Redo,
  AddCircleOutline,
  Delete,
  CloudDownload,
  Timeline,
  ZoomInMap,
} from "@mui/icons-material";

import React, { useEffect, useRef, useState } from "react";

import cytoscape from "cytoscape";
import { dijkstra } from "@/utils/dijkstra";
import toast from "react-hot-toast";
import PromptModal from "./PromptModal"; ////

const GraphContainer = () => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const nodeIDRef = useRef(1);
  const lastHighlightedPathsRef = useRef(null);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [steps, setSteps] = useState([]);
  const [stepHistory, setStepHistory] = useState([]);
  const [staringNode, setStartingNode] = useState("");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayForFirstTime, setIsPlayForFirstTime] = useState(false);
  const [isHighlightVisible, setIsHighlightVisible] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);

  const [intervalID, setIntervalID] = useState(null);
  const [edgeInput, setEdgeInput] = useState({
    source: "",
    target: "",
    weight: 1,
  });

  const handleAddNode = () => {
    if (!cyRef.current) return;
    const id = `${nodeIDRef.current++}`;

    cyRef.current.add({
      group: "nodes",
      data: {
        id,
        idLabel: id, // Use 'label' for center ID
        distanceLabel: "", // Will be updated during dry run
        combinedLabel: id + "\nd:" + "∞",
      },
      position: { x: Math.random() * 400, y: Math.random() * 400 },
    });

    setNodes((prev) => [...prev, { id }]);
  };

  const handleAddEdge = () => {
    const { source, target, weight } = edgeInput;

    if (!source || !target || source == target) return;

    // Check for existing edge A → B
    const forwardEdge = cyRef.current
      .edges()
      .filter(
        (edge) =>
          edge.data("source") === source && edge.data("target") === target
      );
    // if exists then uodate the edge length
    if (forwardEdge.length > 0) {
      forwardEdge[0].data({
        weight: weight, // update weight value
        label: weight.toString(),
      });

      setEdgeInput({ source: "", target: "", weight: 1 });
      toast.success("Edge updated successfully", {
        position: "top-right",
        duration: 1500,
      });
      return; // Exit to avoid adding duplicate edge
    }

    // Check for existing edge B → A
    const reverseEdge = cyRef.current
      .edges()
      .filter(
        (edge) =>
          edge.data("source") === target && edge.data("target") === source
      );

    if (reverseEdge.length > 0) {
      toast.error("Edge already exists between these nodes.", {
        position: "top-right",
        duration: 1500,
      });
      return;
    }
    // throw a error node if node not present
    if (
      !cyRef.current.getElementById(source).length ||
      !cyRef.current.getElementById(target).length
    ) {
      toast.error("Invalid Node", {
        position: "top-right",
        duration: 1500,
      });
    }

    cyRef.current.add({
      group: "edges",
      data: {
        id: `e${source}${target}`,
        source,
        target,
        label: weight.toString(),
        weight,
      },
    });

    setEdges((prev) => [...prev, { source, target, weight }]);
    setEdgeInput({ source: "", target: "", weight: 1 });
  };

  const getAllPaths = (previous, staringNode) => {
    const paths = {};

    for (const target in previous) {
      const path = [];
      let curr = target;

      while (curr && curr !== staringNode) {
        path.unshift({ from: previous[curr], to: curr });
        curr = previous[curr];
      }

      if (curr == staringNode) {
        paths[target] = path;
      }
    }
    return paths;
  };

  const highlightAllPaths = (paths, cy) => {
    cy.edges().removeClass("highlighted");
    cy.nodes().removeClass("highlighted");

    Object.values(paths).forEach((path) => {
      path.forEach(({ from, to }) => {
        const edgeID = `e${from}${to}`;
        cy.getElementById(from).addClass("highlighted");
        cy.getElementById(to).addClass("highlighted");
        cy.getElementById(edgeID).addClass("highlighted");
      });
    });

    cy.style().update();
  };

  const resetDistAll = () => {
    cyRef.current.nodes().forEach((node) => {
      const id = node.id();
      node.data({
        id: id,
        idLabel: id,
        distanceLabel: "",
        combinedLabel: `${id}\nd:${"∞"}`,
      });
    });
  };

  const updateDistanceLabels = (dist) => {
    cyRef.current.nodes().forEach((node) => {
      const id = node.id();
      const distance = dist[id];
      node.data({
        id: id,
        idLabel: id,
        distanceLabel: distance,
        combinedLabel: `${id}\nd:${dist[id] === Infinity ? "∞" : dist[id]}`,
      });
    });
  };

  // Updated handleDijkstras with modal trigger
  const handleDijkstras = () => {
    resetAllHighlights();
    resetDryRunHighlights();
    clearInterval(intervalID);
    setIntervalID(null);
    setCurrentStepIndex(0);
    setIsPlayForFirstTime(true);
    setIsPlaying(false);

    setShowPrompt(true);
  };

  // Handle confirm logic from modal
  const handlePromptConfirm = (startNode) => {
    const nodes = cyRef.current.nodes().map((n) => n.id());
    const edgeList = {};

    cyRef.current.edges().forEach((edge) => {
      const source = edge.data("source");
      const target = edge.data("target");
      const weight = Number(edge.data("weight") || 1);

      if (!edgeList[source]) edgeList[source] = [];
      edgeList[source].push({ target, weight });
    });

    if (!nodes.includes(startNode)) {
      toast.error("Invalid source Node", {
        position: "top-right",
        duration: 1500,
      });
      return;
    }

    setShowPrompt(false);
    setSteps([]);
    const { dist, previous, steps } = dijkstra(nodes, edgeList, startNode);
    setSteps(steps);
    updateDistanceLabels(dist);

    const paths = getAllPaths(previous, startNode);
    lastHighlightedPathsRef.current = paths;
    highlightAllPaths(paths, cyRef.current);

    console.log("Distances:", dist);
    console.log("Paths:", paths);
    console.log("Steps:", steps);
  };

  const glowTemporarily = (ele) => {
    if (!ele || ele.empty()) return;

    const className = ele.isNode() ? "cy-node-glow" : "cy-edge-glow";
    ele.addClass(className);

    setTimeout(() => {
      ele.removeClass(className);
    }, 500); // Keep duration short for snappy effect
  };

  const resetHighlights = () => {
    if (!cyRef.current) return;
    resetDryRunHighlights();
    if (isHighlightVisible) {
      cyRef.current.edges().removeClass("highlighted");
      cyRef.current.nodes().removeClass("highlighted");
    } else {
      if (lastHighlightedPathsRef.current) {
        highlightAllPaths(lastHighlightedPathsRef.current, cyRef.current);
      }
    }

    setIsHighlightVisible(!isHighlightVisible);
  };

  const resetAllHighlights = () => {
    if (!cyRef.current) return;
    cyRef.current.edges().removeClass("highlighted");
    cyRef.current.nodes().removeClass("highlighted");
    setIsHighlightVisible(false);
  };

  const resetDryRunHighlights = () => {
    cyRef.current.nodes().removeClass("visited updated");
    cyRef.current.edges().removeClass("updated");
  };

  const handleClearGraph = () => {
    if (!cyRef.current) return;

    cyRef.current.elements().remove();
    nodeIDRef.current = 1;
    setSteps([]);
  };

  // step-by-step execution
  const playDryRun = () => {
    if (!steps || steps.length === 0) {
      toast.error("Run Dijkstra first!", {
        position: "top-right",
        duration: 1500,
      });
      return;
    }

    //if already palying return
    if (isPlaying) return;

    //for the first time play remove the distances i.e. make infinity
    if (isPlayForFirstTime) {
      resetAllHighlights();
      resetDryRunHighlights();
      resetDistAll();
    }
    if (intervalID) {
      // Just in case: clear previous interval if exists
      clearInterval(intervalID);
      setIntervalID(null);
    }
    //restart if at end
    if (currentStepIndex >= steps.length) {
      setCurrentStepIndex(0);
      resetAllHighlights();
      resetDryRunHighlights();
      resetDistAll();
    }

    //other wise make it running

    setIsPlaying(true);

    const id = setInterval(() => {
      setCurrentStepIndex((prevIndex) => {
        if (prevIndex >= steps.length) {
          clearInterval(id);
          setIsPlaying(false);
          return prevIndex;
        }

        const step = steps[prevIndex];
        applySteps(step);
        setStepHistory((prev) => [...prev, step]);

        return prevIndex + 1;
      });
    }, 1000);

    setIntervalID(id);
    setIsPlayForFirstTime(false);
    console.log("Play dry run");
  };

  const pauseDryRun = () => {
    if (intervalID) {
      clearInterval(intervalID);
      setIntervalID(null);
      setIsPlaying(false);
    }
  };

  const nextStep = () => {
    pauseDryRun();

    if (currentStepIndex >= steps.length) {
      toast.success("Execution finished", {
        position: "top-right",
        duration: 1500,
      });
      return;
    }

    applySteps(steps[currentStepIndex]);
    setStepHistory((prev) => [...prev, steps[currentStepIndex]]);
    setCurrentStepIndex((prev) => prev + 1);
    console.log("Pause dry run");
  };

  const undoStep = () => {
    pauseDryRun();
    if (stepHistory.length === 0) {
      toast.error("Nothing to undo", {
        position: "top-right",
        duration: 1500,
      });
      return;
    }

    const lastStep = stepHistory[stepHistory.length - 1];
    reverseStep(lastStep);
    setStepHistory((prev) => prev.slice(0, -1));
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
    console.log("Undo dry run");
  };

  const applySteps = (step) => {
    if (step.type == "visit") {
      const node = cyRef.current.getElementById(step.node);
      glowTemporarily(node);
      node.addClass("visited");
    } else if (step.type == "update") {
      const edgeId = `e${step.from}${step.to}`;
      const fromNode = cyRef.current.getElementById(step.from);
      const toNode = cyRef.current.getElementById(step.to);
      const edge = cyRef.current.getElementById(edgeId);

      fromNode.addClass("visited");
      toNode.addClass("updated");
      edge.addClass("updated");
      if (!fromNode.hasClass("visited")) glowTemporarily(fromNode);
      glowTemporarily(edge);
      glowTemporarily(toNode);

      toNode.data("distanceLabel", step.distance);
      const currId = toNode.data("idLabel") || step.to;
      toNode.data("combinedLabel", `${currId}\nd: ${step.distance}`);
    }
    console.log("Apply steps run");
  };

  const reverseStep = (step) => {
    if (step.type == "visit") {
      const node = cyRef.current.getElementById(step.node);
      node.removeClass("visited");
    } else if (step.type == "update") {
      const edgeId = `e${step.from}${step.to}`;
      const fromNode = cyRef.current.getElementById(step.from);
      const toNode = cyRef.current.getElementById(step.to);
      const edge = cyRef.current.getElementById(edgeId);

      fromNode.removeClass("visited");
      toNode.removeClass("updated");
      edge.removeClass("updated");

      toNode.data("distanceLabel", "∞");
      const currId = toNode.data().idLabel;
      toNode.data("combinedLabel", `${currId}\nd: ∞ `);

      //cyRef.current.style().update();
      console.log("Reverse steps run");
    }
  };

  const handleDownloadResult = () => {
    if (!cyRef.current) return;

    const cy = cyRef.current;

    // 0 -- store the current as backup
    const backup = cy.nodes().map((node) => ({
      id: node.id(),
      classes: node.classes(),
      combinedLabel: node.data("combinedLabel"),
    }));

    // Save current zoom and pan
    const zoom = cy.zoom();
    const pan = cy.pan();

    // Fit the graph neatly in the viewport (like what you see)
    cy.fit();

    // 1 -- download with result
    const withresults = cy.png({ full: false, scale: 2, bg: "#ffffff" });
    const link1 = document.createElement("a");
    link1.href = withresults;
    link1.download = "graph-with-results.png";
    link1.click();

    // 2 -- remove the distances and highlights
    cy.nodes().forEach((node) => {
      node.removeClass("visited updated");
      node.data("combinedLabel", node.data("idLabel"));
    });
    cy.edges().forEach((edge) => edge.removeClass("updated"));

    // 3 -- wait a bit then download with results
    setTimeout(() => {
      // 4 -- resore the backup
      backup.forEach(({ id, classes, combinedLabel }) => {
        const node = cy.getElementById(id);
        node.classes(classes);
        node.data("combinedLabel", combinedLabel);
      });

      // 5 -- restore zoom and pan
      cy.zoom(zoom);
      cy.pan(pan);
    }, 300);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [], // Empty graph initially
      style: [
        {
          //new
          selector: "node",
          style: {
            "background-color": "gray",
            "text-valign": "center",
            "text-halign": "center",
            "text-wrap": "wrap",
            "font-size": 15,
            width: "40px",
            height: "40px",
            content: "data(combinedLabel)", // This shows both
            color: "black",
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#000",
            "target-arrow-color": "#000",
            "target-arrow-shape": "triangle", // Shows a triangle arrow
            "curve-style": "bezier", // Makes the arrow path curved (better for overlapping)
            label: "data(label)",
            "text-margin-y": -10,
            "text-background-color": "#fff",
            "text-background-padding": "2px",
          },
        },
        {
          selector: "node.highlighted",
          style: {
            "background-color": "#228B22",
            "border-color": "#228B22",
          },
        },
        {
          selector: "edge.highlighted",
          style: {
            "line-style": "solid",
            "line-color": "#228B22",
            "target-arrow-color": "#228B22",
          },
        },
        {
          selector: "node.visited",
          style: {
            "background-color": "#FFA500", // orange
          },
        },
        {
          selector: "node.updated",
          style: {
            "background-color": "#FFA500",
          },
        },
        {
          selector: "edge.updated",
          style: {
            "line-color": "#FFA500",
            "target-arrow-color": "#FFA500",
          },
        },
        {
          selector: ".glow-visit",
          style: {
            "overlay-color": "#4caf50",
            "overlay-opacity": 0.8,
            "overlay-padding": 8,
            "transition-property": "overlay-opacity",
            "transition-duration": "0.1s",
          },
        },
        {
          selector: ".glow-update",
          style: {
            "overlay-color": "#ff9800",
            "overlay-opacity": 0.4,
            "overlay-padding": 8,
            "transition-property": "overlay-opacity",
            "transition-duration": "0.1s",
          },
        },
        {
          selector: ".cy-edge-glow",
          style: {
            "line-color": "#ffcc00",
            width: 1,
            "target-arrow-shape": "triangle", // Optional
            "transition-property": "line-color, width",
            "transition-duration": "0.2s",
          },
        },
        {
          selector: ".cy-node-glow",
          style: {
            "background-color": "#ffcc00", // Glow color
            "border-color": "#ffaa00", // Optional border glow
            "border-width": 1, // Makes glow more visible
            "transition-property":
              "background-color, border-width, border-color",
            "transition-duration": "0.2s",
          },
        },
      ],
      layout: { name: "grid" },
    });

    cyRef.current = cy; // Store for button access

    return () => {
      cy.destroy();
    };
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-10 p-6 lg:p-12">
      {/* Graph Container */}
      <div
        ref={containerRef}
        className="w-full h-[600px] lg:max-w-5xl border rounded-xl bg-white shadow"
      />

      {/* Controls Panel */}
      <div className="flex flex-col items-center w-full max-w-sm space-y-6">
        {/* Add Node / Edge */}
        <div className="flex flex-col gap-4">
          <Button
            onClick={handleAddNode}
            variant="text"
            size="large"
            startIcon={<AddCircleOutline />}
          >
            Add Node
          </Button>

          <input
            type="text"
            placeholder="Source Node Id"
            value={edgeInput.source}
            onChange={(e) =>
              setEdgeInput({ ...edgeInput, source: e.target.value })
            }
            className="border px-3 py-2 rounded-md shadow-sm"
          />
          <input
            type="text"
            placeholder="Target Node Id"
            value={edgeInput.target}
            onChange={(e) =>
              setEdgeInput({ ...edgeInput, target: e.target.value })
            }
            className="border px-3 py-2 rounded-md shadow-sm"
          />
          <input
            type="number"
            placeholder="Weight"
            value={edgeInput.weight}
            onChange={(e) =>
              setEdgeInput({ ...edgeInput, weight: e.target.value })
            }
            className="border px-3 py-2 rounded-md shadow-sm"
          />
          <Button
            onClick={handleAddEdge}
            variant="text"
            size="large"
            startIcon={<Timeline />}
          >
            Add Edge
          </Button>
        </div>

        {/* Dijkstra & Reset */}
        <div className="flex flex-col gap-4">
          <Button
            onClick={handleDijkstras}
            variant="contained"
            color="primary"
            startIcon={<ZoomInMap />}
          >
            Run Dijkstra
          </Button>

          {showPrompt && (
            <PromptModal
              onConfirm={handlePromptConfirm}
              onClose={() => setShowPrompt(false)}
            />
          )}

          <div className="flex gap-4 flex-wrap justify-center">
            <Button
              onClick={resetHighlights}
              variant="outlined"
              startIcon={<Redo />}
            >
              Show Highlights
            </Button>
            <Button
              onClick={handleClearGraph}
              variant="outlined"
              color="error"
              startIcon={<Delete />}
            >
              Clear Graph
            </Button>
          </div>
        </div>

        {/* Dry Run Controls */}
        <div className="flex justify-center gap-3 flex-nowrap overflow-x-auto px-2">
          <Button
            onClick={playDryRun}
            disabled={isPlaying}
            variant="text"
            size="large"
            startIcon={<PlayArrow />}
          >
            Play
          </Button>
          <Button
            onClick={pauseDryRun}
            disabled={!isPlaying}
            variant="text"
            size="large"
            color="error"
            startIcon={<Pause />}
          >
            Pause
          </Button>
          <Button
            onClick={nextStep}
            variant="text"
            size="large"
            startIcon={<Redo />}
          >
            Next
          </Button>
          <Button
            onClick={undoStep}
            variant="text"
            size="large"
            startIcon={<Undo />}
          >
            Undo
          </Button>
        </div>

        {/* Download Button */}
        <Button
          onClick={handleDownloadResult}
          variant="contained"
          color="secondary"
          startIcon={<CloudDownload />}
        >
          Download Graph
        </Button>
      </div>
    </div>
  );
};

export default GraphContainer;
