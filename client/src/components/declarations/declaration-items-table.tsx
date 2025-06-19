import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductSearchCombobox } from "@/components/ui/product-search-combobox";

export interface DeclarationItem {
  id: string;
  hsnCode: string;
  productName: string;
  productCode?: string; // Outbound Batch ID
  quantity: string;
  unit: string;
  rmId?: string; // RM ID
  skuCode?: string; // SKU Code
  isProductSelected?: boolean; // Track if product was selected from dropdown
}

interface DeclarationItemsTableProps {
  items: DeclarationItem[];
  updateItem: (id: string, field: keyof DeclarationItem, value: string | boolean) => void;
}

export default function DeclarationItemsTable({ items, updateItem }: DeclarationItemsTableProps) {
  return (
    <div className="border rounded overflow-hidden">
      <table className="w-full table-fixed">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="w-[22%] px-3 py-2 text-left text-sm font-medium">Product Name <span className="text-red-500">*</span><br/><span className="text-xs font-normal text-gray-500">Select from dropdown</span></th>
            <th className="w-[13%] px-3 py-2 text-left text-sm font-medium">SKU Code</th>
            <th className="w-[15%] px-3 py-2 text-left text-sm font-medium">HSN Code <span className="text-red-500">*</span></th>
            <th className="w-[12%] px-3 py-2 text-left text-sm font-medium">RM ID</th>
            <th className="w-[18%] px-3 py-2 text-left text-sm font-medium">Outbound Batch ID</th>
            <th className="w-[12%] px-3 py-2 text-left text-sm font-medium">Quantity <span className="text-red-500">*</span></th>
            <th className="w-[8%] px-3 py-2 text-left text-sm font-medium">Unit</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td className="w-[22%] px-3 py-2">
                <div className="w-full">
                  <ProductSearchCombobox
                    value={item.productName}
                    onProductSelect={(productName, hsnCode) => {
                      console.log("onProductSelect called:", { productName, hsnCode, itemId: item.id });
                      updateItem(item.id, 'productName', productName);
                      console.log("Product name updated for item:", item.id, "to:", productName);
                      if (hsnCode) {
                        updateItem(item.id, 'hsnCode', hsnCode);
                        updateItem(item.id, 'isProductSelected', true);
                        console.log("HSN code updated for item:", item.id, "to:", hsnCode);
                      } else {
                        updateItem(item.id, 'isProductSelected', false);
                      }
                    }}
                    placeholder="Type to search and select product..."
                  />
                </div>
              </td>
              <td className="w-[13%] px-3 py-2">
                <Input
                  id={`sku-code-${item.id}`}
                  placeholder="e.g. SKU-123"
                  value={item.skuCode || ''}
                  onChange={(e) => updateItem(item.id, 'skuCode', e.target.value)}
                  className="text-sm"
                />
              </td>
              <td className="w-[15%] px-3 py-2">
                <Input
                  id={`hsn-code-${item.id}`}
                  placeholder="e.g. 1511.10.00"
                  value={item.hsnCode}
                  onChange={(e) => updateItem(item.id, 'hsnCode', e.target.value)}
                  readOnly={item.isProductSelected}
                  className={`text-sm ${item.isProductSelected ? "bg-gray-50 cursor-not-allowed" : ""}`}
                />
              </td>
              <td className="w-[12%] px-3 py-2">
                <Input
                  id={`rm-id-${item.id}`}
                  placeholder="e.g. RM123"
                  value={item.rmId || ''}
                  onChange={(e) => updateItem(item.id, 'rmId', e.target.value)}
                  className="text-sm"
                />
              </td>
              <td className="w-[18%] px-3 py-2">
                <Input
                  id={`outbound-batch-id-${item.id}`}
                  placeholder="e.g. OB12345"
                  value={item.productCode || ''}
                  onChange={(e) => updateItem(item.id, 'productCode', e.target.value)}
                  className="text-sm"
                />
              </td>
              <td className="w-[12%] px-3 py-2">
                <Input
                  id={`quantity-${item.id}`}
                  type="text"
                  placeholder="e.g. 5000"
                  value={item.quantity}
                  onChange={(e) => {
                    // Only allow numeric input with decimal point
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    updateItem(item.id, 'quantity', value);
                  }}
                  className="text-sm"
                />
              </td>
              <td className="w-[8%] px-3 py-2">
                <Select
                  value={item.unit}
                  onValueChange={(value) => updateItem(item.id, 'unit', value)}
                >
                  <SelectTrigger id={`unit-${item.id}`} className="text-sm">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="ton">ton</SelectItem>
                    <SelectItem value="liters">liters</SelectItem>
                    <SelectItem value="m³">m³</SelectItem>
                    <SelectItem value="pieces">pieces</SelectItem>
                  </SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}