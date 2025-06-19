import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Users, Building2, Search, ZoomIn, ZoomOut, Edit3, Trash2 } from 'lucide-react';

interface HierarchyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HierarchyModal({ isOpen, onClose }: HierarchyModalProps) {
  const [selectedGroup, setSelectedGroup] = useState('Engineering');
  const [selectedParent, setSelectedParent] = useState('Root');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0">
        <div className="flex h-full">
          {/* Left Sidebar */}
          <div className="w-80 border-r bg-gray-50 flex flex-col">
            <div className="p-4 border-b bg-white">
              <DialogTitle className="text-lg font-semibold mb-3">Hierarchy Controls</DialogTitle>
              
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
              <Button className="w-full mb-2" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
              <Button variant="outline" className="w-full" size="sm">
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
                  defaultChecked
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
              <h1 className="text-lg font-semibold">Organizational Hierarchy</h1>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative bg-gray-50 p-8">
              {/* Sample Hierarchy Visualization */}
              <div className="space-y-6">
                {/* Engineering Group */}
                <div className="flex justify-center">
                  <div className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span className="font-medium">Engineering</span>
                    </div>
                    <div className="text-xs mt-1">4 Perms</div>
                  </div>
                </div>

                {/* Connected Lines */}
                <div className="flex justify-center">
                  <div className="w-px h-8 bg-gray-400"></div>
                </div>

                {/* Sub Teams */}
                <div className="flex justify-center space-x-12">
                  <div className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span className="font-medium">Backend Team</span>
                    </div>
                    <div className="text-xs mt-1">4 Perms</div>
                  </div>
                  
                  <div className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span className="font-medium">Frontend Team</span>
                    </div>
                    <div className="text-xs mt-1">4 Perms</div>
                  </div>
                </div>

                {/* Roles */}
                <div className="flex justify-center space-x-8 mt-8">
                  <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                      <span className="text-sm font-medium">Developer</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">4 Perms</div>
                    <div className="text-xs text-gray-400">Inherited From None</div>
                  </div>

                  <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                      <span className="text-sm font-medium">UI Designer</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">3 Perms</div>
                    <div className="text-xs text-gray-400">Inherited From None</div>
                  </div>

                  <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      <span className="text-sm font-medium">FE Dev</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">4 Perms</div>
                    <div className="text-xs text-gray-400">Inherited From None</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 border-l bg-white flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold mb-3">Edit Group</h3>
              
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
      </DialogContent>
    </Dialog>
  );
}