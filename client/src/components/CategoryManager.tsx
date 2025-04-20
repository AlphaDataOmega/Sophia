import React, { useState, useEffect } from 'react';
import { ToolCategory, toolService } from '../services/ToolService';
import { Plus, Edit, Trash, ChevronRight, ChevronDown } from 'lucide-react';

interface CategoryManagerProps {
  onSelectCategory: (categoryId: string | null) => void;
  selectedCategoryId: string | null;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  onSelectCategory,
  selectedCategoryId
}) => {
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<ToolCategory | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const hierarchy = await toolService.getCategoryHierarchy();
      setCategories(hierarchy);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleAddCategory = async (parentId?: string) => {
    try {
      await toolService.addCategory({
        name: 'New Category',
        description: '',
        parentId
      });
      loadCategories();
      setIsAddingCategory(false);
    } catch (error) {
      console.error('Failed to add category:', error);
    }
  };

  const handleUpdateCategory = async (category: ToolCategory) => {
    try {
      await toolService.updateCategory(category.id, category);
      loadCategories();
      setEditingCategory(null);
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await toolService.deleteCategory(categoryId);
      loadCategories();
      if (selectedCategoryId === categoryId) {
        onSelectCategory(null);
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const renderCategory = (category: ToolCategory, depth = 0) => {
    const isExpanded = expandedCategories.has(category.id);
    const hasChildren = category.children?.length > 0;

    return (
      <div key={category.id} className="space-y-1">
        <div
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${
            selectedCategoryId === category.id
              ? 'bg-blue-500/20 text-blue-400'
              : 'hover:bg-gray-700/50'
          }`}
          style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleExpand(category.id)}
              className="p-0.5 hover:bg-gray-600 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          <button
            className="flex-1 text-left"
            onClick={() => onSelectCategory(category.id)}
          >
            {category.name}
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditingCategory(category)}
              className="p-1 hover:bg-gray-600 rounded"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteCategory(category.id)}
              className="p-1 hover:bg-gray-600 rounded text-red-400"
            >
              <Trash className="w-4 h-4" />
            </button>
          </div>
        </div>
        {isExpanded && category.children?.map(child => renderCategory(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-4 py-2">
        <h3 className="text-lg font-medium">Categories</h3>
        <button
          onClick={() => handleAddCategory()}
          className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-1">
        {categories.map(category => renderCategory(category))}
      </div>
      {editingCategory && (
        <CategoryEditModal
          category={editingCategory}
          onSave={handleUpdateCategory}
          onClose={() => setEditingCategory(null)}
        />
      )}
    </div>
  );
};

interface CategoryEditModalProps {
  category: ToolCategory;
  onSave: (category: ToolCategory) => void;
  onClose: () => void;
}

const CategoryEditModal: React.FC<CategoryEditModalProps> = ({
  category,
  onSave,
  onClose
}) => {
  const [editedCategory, setEditedCategory] = useState(category);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-4 w-96">
        <h3 className="text-lg font-medium mb-4">Edit Category</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              type="text"
              value={editedCategory.name}
              onChange={e => setEditedCategory({ ...editedCategory, name: e.target.value })}
              className="w-full bg-gray-700 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea
              value={editedCategory.description}
              onChange={e => setEditedCategory({ ...editedCategory, description: e.target.value })}
              className="w-full bg-gray-700 rounded px-3 py-2"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(editedCategory)}
              className="px-3 py-1.5 rounded bg-blue-500 hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
