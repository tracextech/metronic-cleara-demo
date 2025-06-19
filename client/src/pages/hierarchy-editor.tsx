import React, { useState, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  BackgroundVariant,
} from 'reactflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Users, Building2, Search, ZoomIn, ZoomOut, Eye, EyeOff, Edit3, Trash2 } from 'lucide-react';
import 'reactflow/dist/style.css';

// Team/Group Node
function TeamNode({ data }: { data: any }) {
  return (
    <div className="px-3 py-2 bg-blue-500 text-white rounded-lg shadow-md min-w-[120px] text-center">
      <div className="flex items-center justify-center gap-1">
        <Users className="w-3 h-3" />
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      <div className="text-xs mt-1">{data.members || 0} Perms</div>
    </div>
  );
}

// Role Node
function RoleNode({ data }: { data: any }) {
  return (
    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm min-w-[120px] text-center">
      <div className="flex items-center justify-center gap-1">
        <div className={`w-2 h-2 rounded-full ${data.color || 'bg-yellow-400'}`}></div>
        <span className="text-sm font-medium text-gray-800">{data.label}</span>
      </div>
      <div className="text-xs text-gray-500 mt-1">{data.permissions || 4} Perms</div>
      <div className="text-xs text-gray-400">Inherited From {data.inheritedFrom || 'None'}</div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  team: TeamNode,
  role: RoleNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'team',
    position: { x: 300, y: 50 },
    data: { label: 'Engineering', members: 4 },
  },
  {
    id: '2',
    type: 'team',
    position: { x: 150, y: 150 },
    data: { label: 'Backend Team', members: 4 },
  },
  {
    id: '3',
    type: 'team',
    position: { x: 450, y: 150 },
    data: { label: 'Frontend Team', members: 4 },
  },
  {
    id: '4',
    type: 'role',
    position: { x: 50, y: 250 },
    data: { label: 'Developer', permissions: 4, inheritedFrom: 'None', color: 'bg-yellow-400' },
  },
  {
    id: '5',
    type: 'role',
    position: { x: 250, y: 250 },
    data: { label: 'UI Designer', permissions: 3, inheritedFrom: 'None', color: 'bg-yellow-400' },
  },
  {
    id: '6',
    type: 'role',
    position: { x: 400, y: 250 },
    data: { label: 'FE Dev', permissions: 4, inheritedFrom: 'None', color: 'bg-green-400' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e1-3', source: '1', target: '3', animated: true },
  { id: 'e2-4', source: '2', target: '4' },
  { id: 'e2-5', source: '2', target: '5' },
  { id: 'e3-6', source: '3', target: '6' },
];

interface HierarchyEditorProps {
  onClose: () => void;
}

export default function HierarchyEditor({ onClose }: HierarchyEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [nodeCounter, setNodeCounter] = useState(7);
  const [showRoleNames, setShowRoleNames] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState('Engineering');
  const [selectedParent, setSelectedParent] = useState('Root');

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addGroup = () => {
    const newNode: Node = {
      id: `${nodeCounter}`,
      type: 'team',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: { label: 'New Group', members: 0 },
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeCounter(nodeCounter + 1);
  };

  const addRole = () => {
    const newNode: Node = {
      id: `${nodeCounter}`,
      type: 'role',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 200 },
      data: { label: 'New Role', permissions: 1, inheritedFrom: 'None', color: 'bg-gray-400' },
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeCounter(nodeCounter + 1);
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex">
      {/* Left Sidebar */}
      <div className="w-80 border-r bg-gray-50 flex flex-col">
        <div className="p-4 border-b bg-white">
          <h2 className="text-lg font-semibold mb-3">Hierarchy Controls</h2>
          
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search..." className="pl-10" />
          </div>
          
          {/* Control buttons */}
          <div className="flex gap-2 mb-3">
            <Button variant="outline" size="sm">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <ZoomOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Create Group Section */}
        <div className="p-4 border-b">
          <Button onClick={addGroup} className="w-full mb-2" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Group
          </Button>
          <Button onClick={addRole} variant="outline" className="w-full" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Role
          </Button>
        </div>

        {/* Settings */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="showRoleNames"
              checked={showRoleNames}
              onChange={(e) => setShowRoleNames(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="showRoleNames" className="text-sm">Show Role Names</Label>
          </div>
          
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-gray-600">Group</Label>
              <div className="text-sm font-medium">{selectedGroup}</div>
            </div>
            <div>
              <Label className="text-xs text-gray-600">Role</Label>
              <div className="text-sm">4</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-white flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Organizational Hierarchy</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-50"
          >
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l bg-white flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Edit Group</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Group Name</Label>
              <Input value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} />
            </div>
            
            <div>
              <Label className="text-sm">Parent Group</Label>
              <Select value={selectedParent} onValueChange={setSelectedParent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Root">Root</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Backend Team">Backend Team</SelectItem>
                  <SelectItem value="Frontend Team">Frontend Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="p-4 border-b">
          <h4 className="font-medium mb-2">Assigned Roles</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Lead Engineer</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm">
                  <Edit3 className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Developer</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm">
                  <Edit3 className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 mt-auto">
          <div className="flex gap-2">
            <Button className="flex-1">Save</Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}