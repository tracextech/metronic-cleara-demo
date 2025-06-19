import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Trash2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EvidenceDocument {
  id: string;
  type: string;
  customName?: string;
  fileName?: string;
  uploaded: boolean;
  nameSaved?: boolean;
}

interface EvidenceDocumentUploaderProps {
  documents: EvidenceDocument[];
  onDocumentsChange: (documents: EvidenceDocument[]) => void;
}

const DOCUMENT_TYPES = [
  { value: "export-invoice", label: "Export Invoice" },
  { value: "packing-list", label: "Packing List" },
  { value: "others", label: "Others" }
];

export default function EvidenceDocumentUploader({ 
  documents, 
  onDocumentsChange 
}: EvidenceDocumentUploaderProps) {
  const [selectedType, setSelectedType] = useState<string>("");

  // Get available document types (exclude already selected ones)
  const availableTypes = DOCUMENT_TYPES.filter(type => 
    type.value === "others" || !documents.some(doc => doc.type === type.value)
  );

  const handleSelectDocument = (type: string) => {
    if (!type) return;

    const newDocument: EvidenceDocument = {
      id: `doc-${Date.now()}`,
      type,
      uploaded: false
    };

    onDocumentsChange([...documents, newDocument]);
    setSelectedType("");
  };

  const handleRemoveDocument = (id: string) => {
    onDocumentsChange(documents.filter(doc => doc.id !== id));
  };

  const handleCustomNameChange = (id: string, customName: string) => {
    onDocumentsChange(
      documents.map(doc => 
        doc.id === id ? { ...doc, customName } : doc
      )
    );
  };

  const handleCustomNameKeyPress = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      const doc = documents.find(d => d.id === id);
      if (doc && doc.customName && doc.customName.trim()) {
        // Name is confirmed, mark as saved and proceed to upload
        onDocumentsChange(
          documents.map(d => 
            d.id === id ? { ...d, customName: d.customName?.trim(), nameSaved: true } : d
          )
        );
        // Auto-proceed to file upload
        setTimeout(() => handleFileUpload(id), 100);
      }
    }
  };

  const handleFileUpload = (id: string) => {
    const doc = documents.find(d => d.id === id);
    
    // For "others" type, check if custom name is saved
    if (doc?.type === "others" && !doc.nameSaved) {
      return; // Don't proceed if custom name is not saved
    }
    
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
    fileInput.multiple = false;
    
    fileInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Update document with uploaded file info
        onDocumentsChange(
          documents.map(doc => 
            doc.id === id ? { ...doc, fileName: file.name, uploaded: true } : doc
          )
        );
      }
    };
    
    // Trigger file selection dialog
    fileInput.click();
  };

  const getDocumentLabel = (doc: EvidenceDocument) => {
    if (doc.type === "others" && doc.customName) {
      return doc.customName;
    }
    const typeConfig = DOCUMENT_TYPES.find(t => t.value === doc.type);
    return typeConfig?.label || doc.type;
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Upload Evidence Documents</Label>
        <p className="text-sm text-gray-500 mb-4">
          Please upload all relevant documentation to support your declaration, including certificates, shipping documents, and any other evidence.
        </p>
      </div>

      {/* Dropdown for adding new documents */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Select value={selectedType} onValueChange={handleSelectDocument}>
            <SelectTrigger>
              <SelectValue placeholder="Upload Evidence Document" />
            </SelectTrigger>
            <SelectContent>
              {availableTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List of added documents */}
      {documents.length > 0 && (
        <div className="space-y-3">
          {documents.map(doc => (
            <div key={doc.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <div className="flex-1">
                      {doc.type === "others" && !doc.nameSaved ? (
                        <div className="space-y-2">
                          <Input
                            placeholder="Enter document name and press Enter"
                            value={doc.customName || ""}
                            onChange={(e) => handleCustomNameChange(doc.id, e.target.value)}
                            onKeyPress={(e) => handleCustomNameKeyPress(e, doc.id)}
                            className="w-full"
                          />
                        </div>
                      ) : (
                        <span className="font-medium text-gray-900">
                          {getDocumentLabel(doc)}
                        </span>
                      )}
                      {doc.fileName && (
                        <p className="text-sm text-green-600 mt-1">
                          Uploaded: {doc.fileName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Upload button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFileUpload(doc.id)}
                    disabled={doc.uploaded || (doc.type === "others" && !doc.nameSaved)}
                    className={cn(
                      "flex items-center gap-2",
                      doc.uploaded && "bg-green-50 border-green-200 text-green-700",
                      doc.type === "others" && !doc.nameSaved && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Upload className="h-4 w-4" />
                    {doc.uploaded ? "Uploaded" : "Upload"}
                  </Button>
                  
                  {/* Delete button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveDocument(doc.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {documents.length > 0 && (
        <div className="text-sm text-gray-600">
          {documents.filter(doc => doc.uploaded).length} of {documents.length} documents uploaded
        </div>
      )}
    </div>
  );
}