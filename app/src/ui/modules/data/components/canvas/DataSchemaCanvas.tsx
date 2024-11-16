import { MarkerType, type Node, Position, ReactFlowProvider } from "@xyflow/react";
import type { AppDataConfig, TAppDataEntity } from "data/data-schema";
import { useBknd } from "ui/client/BkndProvider";
import { useBkndSystemTheme } from "ui/client/schema/system/use-bknd-system";
import { useTheme } from "ui/client/use-theme";
import { Canvas } from "ui/components/canvas/Canvas";
import { layoutWithDagre } from "ui/components/canvas/layouts";
import { Panels } from "ui/components/canvas/panels";
import { EntityTableNode } from "./EntityTableNode";

function entitiesToNodes(entities: AppDataConfig["entities"]): Node<TAppDataEntity>[] {
   return Object.entries(entities ?? {}).map(([name, entity]) => {
      return {
         id: name,
         data: { label: name, ...entity },
         type: "entity",
         dragHandle: ".drag-handle",
         position: { x: 0, y: 0 },
         sourcePosition: Position.Right,
         targetPosition: Position.Left
      };
   });
}

function relationsToEdges(relations: AppDataConfig["relations"]) {
   return Object.entries(relations ?? {}).map(([name, relation]) => {
      let sourceHandle = relation.source + `:${relation.target}`;
      if (relation.config?.mappedBy) {
         sourceHandle = `${relation.source}:${relation.config?.mappedBy}`;
      }
      if (relation.type !== "poly") {
         sourceHandle += "_id";
      }

      return {
         id: name,
         source: relation.source,
         target: relation.target,
         sourceHandle,
         targetHandle: relation.target + ":id"
      };
   });
}

const nodeTypes = {
   entity: EntityTableNode.Component
} as const;

export function DataSchemaCanvas() {
   const {
      config: { data }
   } = useBknd();
   const { theme } = useBkndSystemTheme();
   const nodes = entitiesToNodes(data.entities);
   const edges = relationsToEdges(data.relations).map((e) => ({
      ...e,
      style: {
         stroke: theme === "light" ? "#ccc" : "#666"
      },
      type: "smoothstep",
      markerEnd: {
         type: MarkerType.Arrow,
         width: 20,
         height: 20,
         color: theme === "light" ? "#aaa" : "#777"
      }
   }));

   const nodeLayout = layoutWithDagre({
      nodes: nodes.map((n) => ({
         id: n.id,
         ...EntityTableNode.getSize(n)
      })),
      edges,
      graph: {
         rankdir: "LR",
         //align: "UR",
         ranker: "network-simplex",
         nodesep: 350,
         ranksep: 50
      }
   });

   nodeLayout.nodes.forEach((node) => {
      const n = nodes.find((n) => n.id === node.id);
      if (n) {
         n.position = { x: node.x, y: node.y };
      }
   });

   /*const _edges = edges.map((e) => ({
      ...e,
      source: e.source + `-${e.target}_id`,
      target: e.target + "-id"
   }));*/

   return (
      <ReactFlowProvider>
         <Canvas
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            minZoom={0.1}
            maxZoom={2}
            fitViewOptions={{
               minZoom: 0.1,
               maxZoom: 0.8
            }}
         >
            <Panels zoom minimap />
         </Canvas>
      </ReactFlowProvider>
   );
}
