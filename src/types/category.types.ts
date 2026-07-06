export interface CategoryNode {
  id: string;
  name: string;
  children?: CategoryNode[];
}

export interface GetCategoryTreeResponse {
  success: boolean;
  message: string;
  data: {
    categories: CategoryNode[];
  };
  statusCode: number;
}

export interface GetTopCategoriesResponse {
  success: boolean;
  message: string;
  data: {
    categories: CategoryNode[];
  };
  statusCode: number;
}
