import { supabase } from '@/lib/supabaseClient'
import type { ProductType } from '@/types'

export interface Category {
  id: string
  name: string
  product_type: ProductType
  description: string
  created_at: string
  updated_at: string
}

class CategoryService {
  /**
   * Get all categories
   */
  async getAllCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      return data || []
    } catch (error) {
      console.error('Failed to get categories:', error)
      throw error
    }
  }

  /**
   * Get categories by product type
   */
  async getCategoriesByProductType(productType: ProductType): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('product_type', productType)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      return data || []
    } catch (error) {
      console.error('Failed to get categories:', error)
      throw error
    }
  }

  /**
   * Get a single category by ID
   */
  async getCategory(id: string): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        throw new Error(error.message)
      }

      return data || null
    } catch (error) {
      console.error('Failed to get category:', error)
      throw error
    }
  }

  /**
   * Create a new category (admin only)
   */
  async createCategory(
    name: string,
    productType: ProductType,
    description: string = ''
  ): Promise<Category> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([
          {
            name,
            product_type: productType,
            description,
          },
        ])
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return data
    } catch (error) {
      console.error('Failed to create category:', error)
      throw error
    }
  }

  /**
   * Update a category (admin only)
   */
  async updateCategory(id: string, updates: Partial<Omit<Category, 'id'>>): Promise<Category> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return data
    } catch (error) {
      console.error('Failed to update category:', error)
      throw error
    }
  }

  /**
   * Delete a category (admin only)
   */
  async deleteCategory(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id)

      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('Failed to delete category:', error)
      throw error
    }
  }

  /**
   * Check if category name exists
   */
  async categoryNameExists(name: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id')
        .eq('name', name)
        .maybeSingle()

      if (error) {
        throw new Error(error.message)
      }

      return !!data
    } catch (error) {
      console.error('Failed to check category name:', error)
      throw error
    }
  }
}

export const categoryService = new CategoryService()
