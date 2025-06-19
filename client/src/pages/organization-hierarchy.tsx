import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Plus, Edit2, Trash2, GripVertical } from "lucide-react";

interface OrganizationNode {
  id: string;
  name: string;
  type: 'group' | 'role';
  expanded: boolean;
  editing: boolean;
  children: OrganizationNode[];
  level: number;
}

export default function OrganizationHierarchy() {
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [organizationTree, setOrganizationTree] = useState<OrganizationNode[]>([
    {
      id: "1",
      name: "New Group - Test",
      type: "group",
      expanded: true,
      editing: false,
      level: 0,
      children: [
        {
          id: "2",
          name: "New Group - vajfcs",
          type: "group",
          expanded: true,
          editing: false,
          level: 1,
          children: [
            {
              id: "3",
              name: "New Group - 54gbag",
              type: "group",
              expanded: false,
              editing: false,
              level: 2,
              children: []
            }
          ]
        },
        {
          id: "4",
          name: "New Group - 8ktw6n",
          type: "group",
          expanded: true,
          editing: false,
          level: 1,
          children: [
            {
              id: "5",
              name: "New Group - 0eznrk",
              type: "group",
              expanded: true,
              editing: false,
              level: 2,
              children: [
                {
                  id: "6",
                  name: "New Group - wqtndq",
                  type: "group",
                  expanded: true,
                  editing: false,
                  level: 3,
                  children: [
                    {
                      id: "7",
                      name: "New Group - lxiu4c",
                      type: "group",
                      expanded: false,
                      editing: false,
                      level: 4,
                      children: [
                        {
                          id: "8",
                          name: "New Group - sctlcjq",
                          type: "group",
                          expanded: false,
                          editing: false,
                          level: 5,
                          children: []
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]);

  const addNewGroup = () => {
    const newId = Date.now().toString();
    const newGroup: OrganizationNode = {
      id: newId,
      name: `New Group - ${Math.random().toString(36).substr(2, 6)}`,
      type: "group",
      expanded: true,
      editing: true,
      level: 0,
      children: []
    };
    setOrganizationTree([...organizationTree, newGroup]);
  };

  const addChildGroup = (parentId: string) => {
    const addChild = (nodes: OrganizationNode[]): OrganizationNode[] => {
      return nodes.map(node => {
        if (node.id === parentId) {
          const newChild: OrganizationNode = {
            id: Date.now().toString(),
            name: `New Group - ${Math.random().toString(36).substr(2, 6)}`,
            type: "group",
            expanded: true,
            editing: true,
            level: node.level + 1,
            children: []
          };
          return {
            ...node,
            expanded: true,
            children: [...node.children, newChild]
          };
        } else if (node.children.length > 0) {
          return {
            ...node,
            children: addChild(node.children)
          };
        }
        return node;
      });
    };
    setOrganizationTree(addChild(organizationTree));
  };

  const toggleExpanded = (nodeId: string) => {
    const toggleNode = (nodes: OrganizationNode[]): OrganizationNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, expanded: !node.expanded };
        } else if (node.children.length > 0) {
          return { ...node, children: toggleNode(node.children) };
        }
        return node;
      });
    };
    setOrganizationTree(toggleNode(organizationTree));
  };

  const startEditing = (nodeId: string) => {
    const editNode = (nodes: OrganizationNode[]): OrganizationNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, editing: true };
        } else if (node.children.length > 0) {
          return { ...node, children: editNode(node.children) };
        }
        return node;
      });
    };
    setOrganizationTree(editNode(organizationTree));
  };

  const saveNodeName = (nodeId: string, newName: string) => {
    const saveNode = (nodes: OrganizationNode[]): OrganizationNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, name: newName.trim() || node.name, editing: false };
        } else if (node.children.length > 0) {
          return { ...node, children: saveNode(node.children) };
        }
        return node;
      });
    };
    setOrganizationTree(saveNode(organizationTree));
  };

  const deleteNode = (nodeId: string) => {
    const removeNode = (nodes: OrganizationNode[]): OrganizationNode[] => {
      return nodes
        .filter(node => node.id !== nodeId)
        .map(node => ({
          ...node,
          children: removeNode(node.children)
        }));
    };
    setOrganizationTree(removeNode(organizationTree));
  };

  const renderNode = (node: OrganizationNode) => {
    const hasChildren = node.children.length > 0;
    const paddingLeft = node.level * 20 + 16;

    return (
      <div key={node.id} className="select-none">
        <div 
          className="flex items-center py-2 px-3 hover:bg-purple-50 group relative"
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {/* Drag handle */}
          <GripVertical className="w-3 h-3 text-gray-400 mr-2 cursor-move opacity-0 group-hover:opacity-100" />
          
          {/* Expand/collapse button */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(node.id)}
              className="w-4 h-4 flex items-center justify-center mr-2"
            >
              {node.expanded ? (
                <ChevronDown className="w-3 h-3 text-gray-600" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-600" />
              )}
            </button>
          ) : (
            <div className="w-4 h-4 mr-2" />
          )}

          {/* Node name */}
          <div className="flex-1 flex items-center">
            {node.editing ? (
              <Input
                defaultValue={node.name}
                className="h-7 text-sm border-none shadow-none p-1 focus:ring-1 focus:ring-blue-500"
                autoFocus
                onBlur={(e) => saveNodeName(node.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveNodeName(node.id, e.currentTarget.value);
                  }
                  if (e.key === 'Escape') {
                    saveNodeName(node.id, node.name);
                  }
                }}
              />
            ) : (
              <span 
                className="text-sm text-gray-800 cursor-pointer"
                onDoubleClick={() => startEditing(node.id)}
              >
                {node.name}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => addChildGroup(node.id)}
              className="p-1 hover:bg-purple-100 rounded"
              title="Add child group"
            >
              <Plus className="w-3 h-3 text-purple-600" />
            </button>
            <button
              onClick={() => startEditing(node.id)}
              className="p-1 hover:bg-blue-100 rounded ml-1"
              title="Edit name"
            >
              <Edit2 className="w-3 h-3 text-blue-600" />
            </button>
            <button
              onClick={() => deleteNode(node.id)}
              className="p-1 hover:bg-red-100 rounded ml-1"
              title="Delete"
            >
              <Trash2 className="w-3 h-3 text-red-600" />
            </button>
          </div>
        </div>

        {/* Render children */}
        {node.expanded && node.children.map(child => renderNode(child))}
      </div>
    );
  };

  const filteredTree = organizationTree.filter(node => 
    searchTerm === "" || node.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Hierarchy</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage your organization's hierarchical structure with role-based access controls
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Input
            placeholder="Search organization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64"
          />
          
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Show all" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Show all</SelectItem>
              <SelectItem value="groups">Groups only</SelectItem>
              <SelectItem value="roles">Roles only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={addNewGroup} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>

      {/* Organization Tree */}
      <div className="bg-white border rounded-lg">
        <div className="border-b border-gray-200 p-4">
          <h3 className="text-lg font-medium text-gray-900">Organization Structure</h3>
        </div>
        
        <div className="max-h-[600px] overflow-y-auto">
          {filteredTree.length > 0 ? (
            <div className="py-2">
              {filteredTree.map(node => renderNode(node))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-gray-500">
                <p className="text-lg font-medium mb-2">No organization structure</p>
                <p className="text-sm mb-4">Start by creating your first group</p>
                <Button onClick={addNewGroup} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Group
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">How to use:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Click "Add" to create new top-level groups</li>
          <li>• Hover over any group to see action buttons</li>
          <li>• Click the + button to add a child group</li>
          <li>• Double-click group names to edit them</li>
          <li>• Use the arrow icons to expand/collapse groups with children</li>
          <li>• Drag the grip handle to reorder groups</li>
        </ul>
      </div>
    </div>
  );
}