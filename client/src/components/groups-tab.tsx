import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ChevronRight, ChevronDown, GripVertical, Edit3, Trash2 } from "lucide-react";

interface Group {
  id: number;
  name: string;
  level: number;
  expanded: boolean;
  isEditing: boolean;
  children: Group[];
}

export default function GroupsTab() {
  const [groups, setGroups] = useState<Group[]>([
    {
      id: 1,
      name: "Root Organization",
      level: 0,
      expanded: true,
      isEditing: false,
      children: [
        {
          id: 2,
          name: "Development Team",
          level: 1,
          expanded: true,
          isEditing: false,
          children: [
            { id: 3, name: "Frontend", level: 2, expanded: true, isEditing: false, children: [] },
            { id: 4, name: "Backend", level: 2, expanded: true, isEditing: false, children: [] }
          ]
        },
        {
          id: 5,
          name: "Human Resources",
          level: 1,
          expanded: true,
          isEditing: false,
          children: []
        },
        {
          id: 6,
          name: "Sales & Marketing",
          level: 1,
          expanded: true,
          isEditing: false,
          children: [
            { id: 7, name: "Sales", level: 2, expanded: true, isEditing: false, children: [] },
            { id: 8, name: "Marketing", level: 2, expanded: true, isEditing: false, children: [] }
          ]
        }
      ]
    }
  ]);

  const [nextId, setNextId] = useState(9);

  // Add a new top-level group
  const addTopLevelGroup = () => {
    const newGroup: Group = {
      id: nextId,
      name: "New Group",
      level: 0,
      expanded: true,
      isEditing: true,
      children: []
    };
    setGroups([...groups, newGroup]);
    setNextId(nextId + 1);
  };

  // Add a subgroup under a specific parent
  const addSubgroup = (parentId: number) => {
    const addToGroup = (groupList: Group[]): Group[] => {
      return groupList.map(group => {
        if (group.id === parentId) {
          const newSubgroup: Group = {
            id: nextId,
            name: "New Group",
            level: group.level + 1,
            expanded: true,
            isEditing: true,
            children: []
          };
          return {
            ...group,
            expanded: true,
            children: [...group.children, newSubgroup]
          };
        } else if (group.children.length > 0) {
          return {
            ...group,
            children: addToGroup(group.children)
          };
        }
        return group;
      });
    };

    setGroups(addToGroup(groups));
    setNextId(nextId + 1);
  };

  // Toggle expand/collapse
  const toggleExpand = (groupId: number) => {
    const toggleInGroup = (groupList: Group[]): Group[] => {
      return groupList.map(group => {
        if (group.id === groupId) {
          return { ...group, expanded: !group.expanded };
        } else if (group.children.length > 0) {
          return { ...group, children: toggleInGroup(group.children) };
        }
        return group;
      });
    };

    setGroups(toggleInGroup(groups));
  };

  // Start editing a group name
  const startEditing = (groupId: number) => {
    const editInGroup = (groupList: Group[]): Group[] => {
      return groupList.map(group => {
        if (group.id === groupId) {
          return { ...group, isEditing: true };
        } else if (group.children.length > 0) {
          return { ...group, children: editInGroup(group.children) };
        }
        return group;
      });
    };

    setGroups(editInGroup(groups));
  };

  // Save group name
  const saveGroupName = (groupId: number, newName: string) => {
    const saveInGroup = (groupList: Group[]): Group[] => {
      return groupList.map(group => {
        if (group.id === groupId) {
          return { ...group, name: newName.trim() || "Unnamed Group", isEditing: false };
        } else if (group.children.length > 0) {
          return { ...group, children: saveInGroup(group.children) };
        }
        return group;
      });
    };

    setGroups(saveInGroup(groups));
  };

  // Delete a group
  const deleteGroup = (groupId: number) => {
    const deleteFromGroup = (groupList: Group[]): Group[] => {
      return groupList
        .filter(group => group.id !== groupId)
        .map(group => ({
          ...group,
          children: deleteFromGroup(group.children)
        }));
    };

    setGroups(deleteFromGroup(groups));
  };

  // Render a single group row
  const renderGroup = (group: Group, isHovered: boolean, onHover: (id: number | null) => void) => (
    <div key={group.id} className="group">
      <div 
        className={`flex items-center py-2 px-2 rounded hover:bg-gray-50 ${isHovered ? 'bg-gray-50' : ''}`}
        style={{ paddingLeft: `${group.level * 24 + 8}px` }}
        onMouseEnter={() => onHover(group.id)}
        onMouseLeave={() => onHover(null)}
      >
        {/* Drag handle */}
        <GripVertical className="w-4 h-4 text-gray-400 mr-2 cursor-move" />
        
        {/* Expand/collapse caret */}
        {group.children.length > 0 && (
          <button 
            onClick={() => toggleExpand(group.id)}
            className="mr-2 p-0.5 hover:bg-gray-200 rounded"
          >
            {group.expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </button>
        )}
        
        {/* Group name */}
        <div className="flex-1">
          {group.isEditing ? (
            <Input
              defaultValue={group.name}
              className="h-8 text-sm"
              autoFocus
              onBlur={(e) => saveGroupName(group.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveGroupName(group.id, e.currentTarget.value);
                }
                if (e.key === 'Escape') {
                  saveGroupName(group.id, group.name);
                }
              }}
            />
          ) : (
            <span 
              className="text-sm font-medium cursor-pointer"
              onDoubleClick={() => startEditing(group.id)}
            >
              {group.name}
            </span>
          )}
        </div>
        
        {/* Action buttons */}
        <div className={`flex items-center space-x-1 ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => addSubgroup(group.id)}
          >
            <Plus className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => startEditing(group.id)}
          >
            <Edit3 className="w-3 h-3" />
          </Button>
          {group.level > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              onClick={() => deleteGroup(group.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Render children if expanded */}
      {group.expanded && group.children.map(child => 
        renderGroup(child, isHovered, onHover)
      )}
    </div>
  );

  // Render all groups recursively
  const renderGroups = (groupList: Group[]) => {
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    
    return (
      <div className="space-y-1">
        {groupList.map(group => renderGroup(group, hoveredId === group.id, setHoveredId))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Create New Group button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Organization Groups</h3>
          <p className="text-sm text-gray-500">Create and manage your organization's group hierarchy</p>
        </div>
        <Button onClick={addTopLevelGroup} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create New Group
        </Button>
      </div>

      {/* Groups hierarchy display */}
      <div className="bg-white border rounded-lg p-4">
        <div className="space-y-2">
          {renderGroups(groups)}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">How to use:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Hover over any group to see action buttons</li>
          <li>• Click the + button to add a subgroup</li>
          <li>• Double-click group names to edit them</li>
          <li>• Use the arrow icons to expand/collapse groups with children</li>
          <li>• Drag the grip handle to reorder groups (coming soon)</li>
        </ul>
      </div>
    </div>
  );
}