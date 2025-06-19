import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  NodeTypes,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  UserPlus, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Download,
  Upload,
  Eye,
  EyeOff,
  X
} from 'lucide-react';

// Custom Node Components
const GroupNode = ({ data, selected }: { data: any; selected: boolean }) => {
  return (
    <Card className={`min-w-[200px] ${selected ? 'ring-2 ring-blue-500' : ''} bg-blue-50 border-blue-200`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-medium text-blue-900">{data.name}</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {data.childCount || 0} children
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => data.onAddChildGroup?.(data.id)}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => data.onAddRole?.(data.id)}
          >
            <UserPlus className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => data.onEdit?.(data.id)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
            onClick={() => data.onDelete?.(data.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const RoleNode = ({ data, selected }: { data: any; selected: boolean }) => {
  return (
    <Card className={`min-w-[180px] ${selected ? 'ring-2 ring-yellow-500' : ''} bg-yellow-50 border-yellow-200`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-yellow-900">{data.name}</CardTitle>
          <Badge variant="outline" className="text-xs border-yellow-300">
            {data.assignedCount || 0} assigned
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => data.onEdit?.(data.id)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
            onClick={() => data.onDelete?.(data.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const nodeTypes: NodeTypes = {
  group: GroupNode,
  role: RoleNode,
};

const OrgHierarchyEditorFlow = ({ onClose }: { onClose: () => void }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project, getViewport, zoomIn, zoomOut, fitView } = useReactFlow();
  
  // Node creation functions
  const handleAddChildGroup = useCallback((parentId: string) => {
    const newId = `group-${Date.now()}`;
    const parentNode = nodes.find(n => n.id === parentId);
    if (!parentNode) return;

    const newNode: Node = {
      id: newId,
      type: 'group',
      position: { 
        x: parentNode.position.x + Math.random() * 100 - 50, 
        y: parentNode.position.y + 150 
      },
      data: { 
        name: 'New Group',
        childCount: 0,
        onAddChildGroup: handleAddChildGroup,
        onAddRole: handleAddRole,
        onEdit: handleEditNode,
        onDelete: handleDeleteNode
      },
    };

    const newEdge: Edge = {
      id: `e${parentId}-${newId}`,
      source: parentId,
      target: newId,
      type: 'straight',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#6b7280', strokeWidth: 2 }
    };

    setNodes(nds => [...nds, newNode]);
    setEdges(eds => [...eds, newEdge]);
  }, []);

  const handleAddRole = useCallback((parentId: string) => {
    const newId = `role-${Date.now()}`;
    const parentNode = nodes.find(n => n.id === parentId);
    if (!parentNode) return;

    const newNode: Node = {
      id: newId,
      type: 'role',
      position: { 
        x: parentNode.position.x + Math.random() * 100 - 50, 
        y: parentNode.position.y + 150 
      },
      data: { 
        name: 'New Role',
        assignedCount: 0,
        onEdit: handleEditNode,
        onDelete: handleDeleteNode
      },
    };

    const newEdge: Edge = {
      id: `e${parentId}-${newId}`,
      source: parentId,
      target: newId,
      type: 'straight',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#6b7280', strokeWidth: 2 }
    };

    setNodes(nds => [...nds, newNode]);
    setEdges(eds => [...eds, newEdge]);
  }, []);

  const handleEditNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
    }
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, []);

  // Initial data
  const initialNodes: Node[] = [
    {
      id: '1',
      type: 'group',
      position: { x: 250, y: 50 },
      data: { 
        name: 'Engineering',
        childCount: 3,
        onAddChildGroup: handleAddChildGroup,
        onAddRole: handleAddRole,
        onEdit: handleEditNode,
        onDelete: handleDeleteNode
      },
    },
    {
      id: '2',
      type: 'group',
      position: { x: 100, y: 200 },
      data: { 
        name: 'Backend Team',
        childCount: 2,
        onAddChildGroup: handleAddChildGroup,
        onAddRole: handleAddRole,
        onEdit: handleEditNode,
        onDelete: handleDeleteNode
      },
    },
    {
      id: '3',
      type: 'group',
      position: { x: 400, y: 200 },
      data: { 
        name: 'Frontend Team',
        childCount: 2,
        onAddChildGroup: handleAddChildGroup,
        onAddRole: handleAddRole,
        onEdit: handleEditNode,
        onDelete: handleDeleteNode
      },
    },
    {
      id: '4',
      type: 'role',
      position: { x: 50, y: 350 },
      data: { 
        name: 'Developer',
        assignedCount: 4,
        onEdit: handleEditNode,
        onDelete: handleDeleteNode
      },
    },
    {
      id: '5',
      type: 'role',
      position: { x: 200, y: 350 },
      data: { 
        name: 'UI Designer',
        assignedCount: 3,
        onEdit: handleEditNode,
        onDelete: handleDeleteNode
      },
    },
  ];

  const initialEdges: Edge[] = [
    {
      id: 'e1-2',
      source: '1',
      target: '2',
      type: 'straight',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#6b7280', strokeWidth: 2 }
    },
    {
      id: 'e1-3',
      source: '1',
      target: '3',
      type: 'straight',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#6b7280', strokeWidth: 2 }
    },
    {
      id: 'e2-4',
      source: '2',
      target: '4',
      type: 'straight',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#6b7280', strokeWidth: 2 }
    },
    {
      id: 'e3-5',
      source: '3',
      target: '5',
      type: 'straight',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#6b7280', strokeWidth: 2 }
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showRoleNames, setShowRoleNames] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string; nodeType: string } | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
        nodeType: node.type || 'group'
      });
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleSaveNode = () => {
    if (!selectedNode) return;

    setNodes(nds => 
      nds.map(node => 
        node.id === selectedNode.id 
          ? { ...node, data: { ...node.data, name: selectedNode.data.name } }
          : node
      )
    );
    setSelectedNode(null);
  };

  const exportHierarchy = () => {
    const hierarchy = {
      nodes: nodes.map(node => ({
        ...node,
        data: { ...node.data, onAddChildGroup: undefined, onAddRole: undefined, onEdit: undefined, onDelete: undefined }
      })),
      edges,
      viewport: getViewport()
    };
    
    const dataStr = JSON.stringify(hierarchy, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'org-hierarchy.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex">
      {/* Left Panel - Controls */}
      <div className="w-64 bg-gray-50 border-r p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Hierarchy Controls</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          <Button 
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => handleAddChildGroup('1')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
          
          <Button 
            className="w-full bg-yellow-500 text-white hover:bg-yellow-600"
            onClick={() => handleAddRole('1')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Show Role Names</Label>
            <Switch 
              checked={showRoleNames}
              onCheckedChange={setShowRoleNames}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></span>
            <span className="text-xs text-gray-600">Group</span>
            <span className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></span>
            <span className="text-xs text-gray-600">Role</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Zoom Controls</h4>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => zoomIn()}>
              <ZoomIn className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => zoomOut()}>
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => fitView()}>
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full" onClick={exportHierarchy}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          
          <Button variant="outline" size="sm" className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            Import JSON
          </Button>
        </div>

        <div className="absolute bottom-4 left-4 right-4 text-xs text-gray-500 space-y-1">
          <p>• Drag & drop to rearrange</p>
          <p>• Right-click for node menu</p>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 relative">
        <div ref={reactFlowWrapper} className="w-full h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-25"
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="absolute bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onMouseLeave={closeContextMenu}
          >
            {contextMenu.nodeType === 'group' ? (
              <>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  onClick={() => {
                    handleAddChildGroup(contextMenu.nodeId);
                    closeContextMenu();
                  }}
                >
                  Add Child Group
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  onClick={() => {
                    handleEditNode(contextMenu.nodeId);
                    closeContextMenu();
                  }}
                >
                  Rename Group
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600"
                  onClick={() => {
                    handleDeleteNode(contextMenu.nodeId);
                    closeContextMenu();
                  }}
                >
                  Delete Group
                </button>
              </>
            ) : (
              <>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  onClick={() => {
                    handleEditNode(contextMenu.nodeId);
                    closeContextMenu();
                  }}
                >
                  Edit Role
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600"
                  onClick={() => {
                    handleDeleteNode(contextMenu.nodeId);
                    closeContextMenu();
                  }}
                >
                  Delete Role
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Panel - Properties */}
      <div className="w-80 bg-gray-50 border-l p-4 space-y-4">
        {selectedNode ? (
          <>
            <h3 className="font-semibold">
              {selectedNode.type === 'group' ? 'Edit Group' : 'Edit Role'}
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nodeName">Name</Label>
                <Input
                  id="nodeName"
                  value={selectedNode.data.name}
                  onChange={(e) => 
                    setSelectedNode({
                      ...selectedNode,
                      data: { ...selectedNode.data, name: e.target.value }
                    })
                  }
                />
              </div>

              {selectedNode.type === 'group' && (
                <div className="space-y-2">
                  <Label htmlFor="parentGroup">Parent Group</Label>
                  <Select defaultValue="root">
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root">Root</SelectItem>
                      {nodes
                        .filter(n => n.type === 'group' && n.id !== selectedNode.id)
                        .map(n => (
                          <SelectItem key={n.id} value={n.id}>
                            {n.data.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSaveNode} className="flex-1">
                  Save
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedNode(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                {selectedNode.type === 'group' ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleAddChildGroup(selectedNode.id)}
                    >
                      Add Child Group
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleAddRole(selectedNode.id)}
                    >
                      Add Role
                    </Button>
                  </>
                ) : null}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-red-600 hover:text-red-700"
                  onClick={() => {
                    handleDeleteNode(selectedNode.id);
                    setSelectedNode(null);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 mt-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Select a node to edit its properties</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface OrgHierarchyEditorProps {
  onClose: () => void;
}

export default function OrgHierarchyEditor({ onClose }: OrgHierarchyEditorProps) {
  return (
    <ReactFlowProvider>
      <OrgHierarchyEditorFlow onClose={onClose} />
    </ReactFlowProvider>
  );
}