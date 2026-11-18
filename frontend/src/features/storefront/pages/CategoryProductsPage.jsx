import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';

export const CategoryProductsPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (slug) {
      navigate(`${ROUTE_PATHS.STOREFRONT.PRODUCTS}?category=${encodeURIComponent(slug)}`, {
        replace: true,
      });
    } else {
      navigate(ROUTE_PATHS.STOREFRONT.CATEGORIES, { replace: true });
    }
  }, [slug, navigate]);

  return null;
};

export default CategoryProductsPage;
