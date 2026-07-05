// Client-provided official listing category tree.
// Replace with `GET /listings/categories` once the listing service ships
// (the API contract should mirror this exact shape).
//
// Shape rule (from v2 plan): 3-level nested {top, sub, leaf}. The client's
// current taxonomy is two levels deep (Top → Sub), so for v1 we treat each
// Sub as the "leaf" — every Sub node has a stable id usable for filtering +
// posting. The tree can deepen later without breaking the type or any
// consumer that asks for the leaf id.
//
// Scope: PRODUCT categories only. The client also provided a Service
// taxonomy (AC repair, Plumbing, Salon, etc.) — those are explicitly
// EXCLUDED from v1 because the Service tab is gated to Phase 2 by the
// locked product decisions. They'll come back as a separate `kind: 'service'`
// branch when Book Service ships.

export interface CategoryNode {
  id: string;
  name: string;
  children?: CategoryNode[];
}

const sub = (parentId: string, slug: string, name: string): CategoryNode => ({
  id: `${parentId}-${slug}`,
  name,
});

export const STUB_CATEGORY_TREE: CategoryNode[] = [
  {
    id: 'properties',
    name: 'Properties',
    children: [
      sub('properties', 'apartments', 'Apartments'),
      sub('properties', 'villas', 'Villas'),
      sub('properties', 'independent-houses', 'Independent Houses'),
      sub('properties', 'plots-land', 'Plots & Land'),
      sub('properties', 'commercial-office', 'Commercial Office'),
      sub('properties', 'shops-showrooms', 'Shops & Showrooms'),
      sub('properties', 'warehouses', 'Warehouses'),
      sub('properties', 'pg-hostels', 'PG & Hostels'),
      sub('properties', 'coworking-spaces', 'Coworking Spaces'),
      sub('properties', 'farm-lands', 'Farm Lands'),
      sub('properties', 'rental-properties', 'Rental Properties'),
    ],
  },
  {
    id: 'vehicles',
    name: 'Vehicles',
    children: [
      sub('vehicles', 'cars', 'Cars'),
      sub('vehicles', 'bikes', 'Bikes'),
      sub('vehicles', 'scooters', 'Scooters'),
      sub('vehicles', 'electric-vehicles', 'Electric Vehicles'),
      sub('vehicles', 'commercial-vehicles', 'Commercial Vehicles'),
      sub('vehicles', 'trucks', 'Trucks'),
      sub('vehicles', 'tractors', 'Tractors'),
      sub('vehicles', 'auto-rickshaws', 'Auto Rickshaws'),
      sub('vehicles', 'bicycles', 'Bicycles'),
      sub('vehicles', 'accessories', 'Vehicle Accessories'),
      sub('vehicles', 'spare-parts', 'Vehicle Spare Parts'),
    ],
  },
  {
    id: 'electronics',
    name: 'Electronics',
    children: [
      sub('electronics', 'mobiles', 'Mobiles'),
      sub('electronics', 'laptops', 'Laptops'),
      sub('electronics', 'tablets', 'Tablets'),
      sub('electronics', 'smart-watches', 'Smart Watches'),
      sub('electronics', 'cameras', 'Cameras'),
      sub('electronics', 'tvs', 'TVs'),
      sub('electronics', 'audio-systems', 'Audio Systems'),
      sub('electronics', 'gaming-consoles', 'Gaming Consoles'),
      sub('electronics', 'computer-accessories', 'Computer Accessories'),
      sub('electronics', 'printers', 'Printers'),
      sub('electronics', 'cctv-security', 'CCTV & Security'),
    ],
  },
  {
    id: 'furniture-home',
    name: 'Furniture & Home',
    children: [
      sub('furniture-home', 'sofas', 'Sofas'),
      sub('furniture-home', 'beds', 'Beds'),
      sub('furniture-home', 'dining-tables', 'Dining Tables'),
      sub('furniture-home', 'chairs', 'Chairs'),
      sub('furniture-home', 'wardrobes', 'Wardrobes'),
      sub('furniture-home', 'mattresses', 'Mattresses'),
      sub('furniture-home', 'modular-kitchen', 'Modular Kitchen'),
      sub('furniture-home', 'office-furniture', 'Office Furniture'),
      sub('furniture-home', 'home-decor', 'Home Decor'),
      sub('furniture-home', 'lighting', 'Lighting'),
    ],
  },
  {
    id: 'fashion-lifestyle',
    name: 'Fashion & Lifestyle',
    children: [
      sub('fashion-lifestyle', 'mens-wear', "Men's Wear"),
      sub('fashion-lifestyle', 'womens-wear', "Women's Wear"),
      sub('fashion-lifestyle', 'kids-wear', 'Kids Wear'),
      sub('fashion-lifestyle', 'footwear', 'Footwear'),
      sub('fashion-lifestyle', 'watches', 'Watches'),
      sub('fashion-lifestyle', 'handbags', 'Handbags'),
      sub('fashion-lifestyle', 'jewellery', 'Jewellery'),
      sub('fashion-lifestyle', 'cosmetics', 'Cosmetics'),
      sub('fashion-lifestyle', 'sunglasses', 'Sunglasses'),
    ],
  },
  {
    id: 'food-agriculture',
    name: 'Food & Agriculture',
    children: [
      sub('food-agriculture', 'groceries', 'Groceries'),
      sub('food-agriculture', 'organic-products', 'Organic Products'),
      sub('food-agriculture', 'fruits-vegetables', 'Fruits & Vegetables'),
      sub('food-agriculture', 'dairy-products', 'Dairy Products'),
      sub('food-agriculture', 'bakery', 'Bakery'),
      sub('food-agriculture', 'meat-seafood', 'Meat & Seafood'),
      sub('food-agriculture', 'farming-equipment', 'Farming Equipment'),
      sub('food-agriculture', 'seeds-fertilizers', 'Seeds & Fertilizers'),
      sub('food-agriculture', 'poultry-livestock', 'Poultry & Livestock'),
    ],
  },
  {
    id: 'industrial-business',
    name: 'Industrial & Business',
    children: [
      sub('industrial-business', 'machinery', 'Machinery'),
      sub('industrial-business', 'industrial-tools', 'Industrial Tools'),
      sub('industrial-business', 'construction-materials', 'Construction Materials'),
      sub('industrial-business', 'packaging-materials', 'Packaging Materials'),
      sub('industrial-business', 'electrical-equipment', 'Electrical Equipment'),
      sub('industrial-business', 'office-supplies', 'Office Supplies'),
      sub('industrial-business', 'wholesale-products', 'Wholesale Products'),
    ],
  },
  {
    id: 'pets-animals',
    name: 'Pets & Animals',
    children: [
      sub('pets-animals', 'dogs', 'Dogs'),
      sub('pets-animals', 'cats', 'Cats'),
      sub('pets-animals', 'birds', 'Birds'),
      sub('pets-animals', 'fish', 'Fish'),
      sub('pets-animals', 'pet-food', 'Pet Food'),
      sub('pets-animals', 'pet-accessories', 'Pet Accessories'),
      sub('pets-animals', 'farm-animals', 'Farm Animals'),
    ],
  },
  {
    id: 'education-books',
    name: 'Education & Books',
    children: [
      sub('education-books', 'school-books', 'School Books'),
      sub('education-books', 'competitive-exam-books', 'Competitive Exam Books'),
      sub('education-books', 'college-books', 'College Books'),
      sub('education-books', 'online-courses', 'Online Courses'),
      sub('education-books', 'educational-materials', 'Educational Materials'),
    ],
  },
  {
    id: 'sports-hobby',
    name: 'Sports & Hobby',
    children: [
      sub('sports-hobby', 'gym-equipment', 'Gym Equipment'),
      sub('sports-hobby', 'cycles', 'Cycles'),
      sub('sports-hobby', 'outdoor-sports', 'Outdoor Sports'),
      sub('sports-hobby', 'indoor-games', 'Indoor Games'),
      sub('sports-hobby', 'musical-instruments', 'Musical Instruments'),
      sub('sports-hobby', 'camping-gear', 'Camping Gear'),
    ],
  },
  {
    id: 'kids-baby',
    name: 'Kids & Baby Products',
    children: [
      sub('kids-baby', 'baby-toys', 'Baby Toys'),
      sub('kids-baby', 'baby-clothes', 'Baby Clothes'),
      sub('kids-baby', 'strollers', 'Strollers'),
      sub('kids-baby', 'baby-furniture', 'Baby Furniture'),
      sub('kids-baby', 'school-supplies', 'School Supplies'),
    ],
  },
  {
    id: 'jobs',
    name: 'Jobs',
    children: [
      sub('jobs', 'it', 'IT Jobs'),
      sub('jobs', 'delivery', 'Delivery Jobs'),
      sub('jobs', 'driver', 'Driver Jobs'),
      sub('jobs', 'office', 'Office Jobs'),
      sub('jobs', 'part-time', 'Part-Time Jobs'),
      sub('jobs', 'freelance', 'Freelance Jobs'),
      sub('jobs', 'hospitality', 'Hospitality Jobs'),
      sub('jobs', 'construction', 'Construction Jobs'),
    ],
  },
];

/**
 * Find a category node anywhere in the tree by id.
 */
export const findCategoryNode = (
  id: string,
  tree: CategoryNode[] = STUB_CATEGORY_TREE,
): CategoryNode | undefined => {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children) {
      const hit = findCategoryNode(id, node.children);
      if (hit) return hit;
    }
  }
  return undefined;
};

/**
 * Resolve the breadcrumb path (array of node names) leading to a given id.
 * Returns empty array if the id isn't found.
 */
export const resolveCategoryPath = (
  id: string,
  tree: CategoryNode[] = STUB_CATEGORY_TREE,
  trail: string[] = [],
): string[] => {
  for (const node of tree) {
    const nextTrail = [...trail, node.name];
    if (node.id === id) return nextTrail;
    if (node.children) {
      const hit = resolveCategoryPath(id, node.children, nextTrail);
      if (hit.length) return hit;
    }
  }
  return [];
};
