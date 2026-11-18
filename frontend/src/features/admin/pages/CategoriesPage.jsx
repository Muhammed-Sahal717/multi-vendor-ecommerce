import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  FolderTree,
  Tag,
} from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { catalogService } from '../../storefront/services/catalogService.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Textarea } from '../../../components/ui/textarea.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog.jsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog.jsx';

export const CategoriesPage = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog State (Create or Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parent: '',
  });
  const [formError, setFormError] = useState('');

  // Delete Alert State
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // Fetch categories
  const { data: categoriesData, isLoading, isError, refetch } = useQuery({
    queryKey: ['catalog', 'categories'],
    queryFn: () => catalogService.getCategories(),
  });

  const categories = Array.isArray(categoriesData)
    ? categoriesData
    : categoriesData?.results || [];

  const filteredCategories = categories.filter((cat) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      cat.name?.toLowerCase().includes(q) ||
      cat.slug?.toLowerCase().includes(q) ||
      cat.description?.toLowerCase().includes(q)
    );
  });

  // Create or Update mutation
  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (editingCategory) {
        return adminService.updateCategory(editingCategory.slug, payload);
      }
      return adminService.createCategory(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'categories'] });
      setIsFormOpen(false);
      resetForm();
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.name?.[0] ||
        err?.response?.data?.slug?.[0] ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to save category.';
      setFormError(msg);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (slug) => adminService.deleteCategory(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'categories'] });
      setCategoryToDelete(null);
    },
  });

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({ name: '', slug: '', description: '', parent: '' });
    setFormError('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      parent: cat.parent?.id || cat.parent || '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleNameChange = (val) => {
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: !editingCategory ? generatedSlug : prev.slug,
    }));
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Category name is required.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      description: formData.description.trim(),
    };
    if (formData.parent) {
      payload.parent = formData.parent;
    }

    saveMutation.mutate(payload);
  };

  const handleConfirmDelete = () => {
    if (!categoryToDelete) return;
    deleteMutation.mutate(categoryToDelete.slug);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Categories Taxonomy
            </h1>
            <Badge variant="secondary" className="font-bold text-xs">
              {filteredCategories.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organize artisan specialties, traditional crafts, and product categories for storefront navigation.
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleOpenCreate}
          className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground text-xs shadow-2xs gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>Add New Category</span>
        </Button>
      </div>

      {/* Toolbar */}
      <Card className="p-4 border-border/80 bg-card/60 backdrop-blur-xs">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search categories by name, slug, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl bg-card border-border"
          />
        </div>
      </Card>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-5 animate-pulse border-border bg-card space-y-3">
              <div className="h-5 w-1/2 bg-muted rounded" />
              <div className="h-3 w-3/4 bg-muted/60 rounded" />
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="p-8 text-center border-destructive/20 bg-destructive/5 space-y-3">
          <AlertCircle size={32} className="mx-auto text-destructive" />
          <h3 className="text-sm font-bold text-foreground">Failed to load categories</h3>
          <p className="text-xs text-muted-foreground">Unable to fetch taxonomy list.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer">
            Retry
          </Button>
        </Card>
      ) : filteredCategories.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border bg-card/40 space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Layers size={28} />
          </div>
          <h3 className="text-sm font-bold text-foreground">No categories found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery ? 'No categories matched your search.' : 'Start by creating your first craft category.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => (
            <Card
              key={cat.id || cat.slug}
              className="p-5 border-border bg-card hover:border-primary/40 transition-all shadow-2xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Layers size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">{cat.name}</h3>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        /{cat.slug}
                      </span>
                    </div>
                  </div>

                  {cat.parent && (
                    <Badge variant="outline" className="text-[10px] py-0 font-semibold text-muted-foreground">
                      Subcategory
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {cat.description || 'No description provided for this artisan category.'}
                </p>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between border-t border-border/60 pt-3">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Tag size={12} className="text-primary/70" />
                  <span>{cat.product_count ?? 0} listings</span>
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(cat)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Edit category"
                  >
                    <Edit2 size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCategoryToDelete(cat)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    title="Delete category"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Category Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <FolderTree size={18} className="text-primary" />
              <span>{editingCategory ? 'Edit Category' : 'Create New Category'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the category name, URL slug, and artisan craft description.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="catName" className="text-xs font-bold text-foreground">
                Category Name *
              </Label>
              <Input
                id="catName"
                type="text"
                placeholder="e.g. Handwoven Textiles"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="text-xs rounded-xl bg-background border-border"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="catSlug" className="text-xs font-bold text-foreground">
                URL Slug *
              </Label>
              <Input
                id="catSlug"
                type="text"
                placeholder="handwoven-textiles"
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                className="text-xs font-mono rounded-xl bg-background border-border"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="catDesc" className="text-xs font-bold text-foreground">
                Description (Optional)
              </Label>
              <Textarea
                id="catDesc"
                placeholder="Describe the craft types, heritage, and materials included in this category..."
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="text-xs rounded-xl min-h-[80px] bg-background border-border"
              />
            </div>

            {formError && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-2.5 text-xs text-destructive font-medium flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFormOpen(false)}
                className="rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveMutation.isPending}
                className="rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs gap-1.5 cursor-pointer"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{editingCategory ? 'Save Changes' : 'Create Category'}</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent className="rounded-2xl bg-card border-border sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Trash2 size={18} className="text-destructive" />
              <span>Delete Category?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete &ldquo;{categoryToDelete?.name}&rdquo;? Any products assigned to this category may become unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="rounded-xl text-xs font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Delete Category</span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CategoriesPage;
