export type PantryCategoryId =
  | "vegetables"
  | "fruits"
  | "herbs_spices"
  | "meat_poultry"
  | "fish_seafood"
  | "dairy_eggs"
  | "grains_pasta"
  | "legumes_nuts"
  | "pantry_basics"
  | "condiments_sauces"
  | "bakery"
  | "beverages";

export type CatalogItem = {
  id: string;
  ka: string;
  en: string;
  category: PantryCategoryId;
  aliases: string[];
  isBasic?: boolean;
};

export type CatalogCategory = {
  id: PantryCategoryId;
  ka: string;
  en: string;
};

export const PANTRY_CATEGORIES: CatalogCategory[] = [
  { id: "vegetables", ka: "ბოსტნეული", en: "Vegetables" },
  { id: "fruits", ka: "ხილი", en: "Fruits" },
  { id: "herbs_spices", ka: "მწვანილი და სანელებლები", en: "Herbs and spices" },
  { id: "meat_poultry", ka: "ხორცი", en: "Meat" },
  { id: "fish_seafood", ka: "თევზი და ზღვის პროდუქტი", en: "Fish and seafood" },
  { id: "dairy_eggs", ka: "რძის ნაწარმი და კვერცხი", en: "Dairy and eggs" },
  { id: "grains_pasta", ka: "მარცვლეული და მაკარონი", en: "Grains and pasta" },
  { id: "legumes_nuts", ka: "პარკოსნები და თხილეული", en: "Legumes and nuts" },
  { id: "pantry_basics", ka: "ძირითადი მარაგი", en: "Pantry basics" },
  { id: "condiments_sauces", ka: "სოუსები", en: "Sauces" },
  { id: "bakery", ka: "ცომეული", en: "Bakery" },
  { id: "beverages", ka: "სასმელები", en: "Beverages" },
];

export const PANTRY_CATALOG: CatalogItem[] = [
  // Vegetables
  { id: "tomato", ka: "პომიდორი", en: "Tomato", category: "vegetables", aliases: ["პომიდვრები", "პომიდვრის", "tomatoes"] },
  { id: "onion", ka: "ხახვი", en: "Onion", category: "vegetables", aliases: ["ხახვის", "onions"] },
  { id: "garlic", ka: "ნიორი", en: "Garlic", category: "vegetables", aliases: ["ნივრის", "ნივრები", "garlic clove"] },
  { id: "carrot", ka: "სტაფილო", en: "Carrot", category: "vegetables", aliases: ["სტაფილოს", "carrots"] },
  { id: "potato", ka: "კარტოფილი", en: "Potato", category: "vegetables", aliases: ["კარტოფილის", "potatoes"] },
  { id: "eggplant", ka: "ბადრიჯანი", en: "Eggplant", category: "vegetables", aliases: ["ბადრიჯნის", "aubergine"] },
  { id: "zucchini", ka: "ყაბაყი", en: "Zucchini", category: "vegetables", aliases: ["ყაბაყის", "courgette"] },
  { id: "cabbage", ka: "კომბოსტო", en: "Cabbage", category: "vegetables", aliases: ["კომბოსტოს"] },
  { id: "spinach", ka: "ისპანახი", en: "Spinach", category: "vegetables", aliases: ["ისპანახის"] },
  { id: "cucumber", ka: "კიტრი", en: "Cucumber", category: "vegetables", aliases: ["კიტრის", "cucumbers"] },
  { id: "bell_pepper", ka: "ბულგარული წიწაკა", en: "Bell pepper", category: "vegetables", aliases: ["წიწაკა", "ბულგარული", "paprika"] },
  { id: "mushroom", ka: "სოკო", en: "Mushroom", category: "vegetables", aliases: ["სოკოს", "mushrooms"] },
  { id: "corn", ka: "სიმინდი", en: "Corn", category: "vegetables", aliases: ["სიმინდის"] },

  // Fruits
  { id: "lemon", ka: "ლიმონი", en: "Lemon", category: "fruits", aliases: ["ლიმონის", "lemons"] },
  { id: "apple", ka: "ვაშლი", en: "Apple", category: "fruits", aliases: ["ვაშლის", "apples"] },
  { id: "banana", ka: "ბანანი", en: "Banana", category: "fruits", aliases: ["ბანანის", "bananas"] },
  { id: "orange", ka: "ფორთოხალი", en: "Orange", category: "fruits", aliases: ["ფორთოხლის", "oranges"] },

  // Herbs and spices
  { id: "parsley", ka: "ოხრახუში", en: "Parsley", category: "herbs_spices", aliases: ["ოხრახუშის"] },
  { id: "cilantro", ka: "ქინძი", en: "Cilantro", category: "herbs_spices", aliases: ["ქინძის", "coriander"] },
  { id: "dill", ka: "კამა", en: "Dill", category: "herbs_spices", aliases: ["კამის"] },
  { id: "basil", ka: "ბაზილიკი", en: "Basil", category: "herbs_spices", aliases: ["ბაზილიკის", "რეჰანი"] },
  { id: "mint", ka: "პიტნა", en: "Mint", category: "herbs_spices", aliases: ["პიტნის"] },
  { id: "khmeli_suneli", ka: "ხმელი სუნელი", en: "Khmeli suneli", category: "herbs_spices", aliases: ["სუნელი", "სუნელის"] },
  { id: "paprika_spice", ka: "წითელი წიწაკა", en: "Red pepper", category: "herbs_spices", aliases: ["წითელი", "ცხარე წიწაკა", "paprika spice"] },
  { id: "bay_leaf", ka: "დაფნის ფოთოლი", en: "Bay leaf", category: "herbs_spices", aliases: ["დაფნის", "bay leaves"] },
  { id: "cinnamon", ka: "დარიჩინი", en: "Cinnamon", category: "herbs_spices", aliases: ["დარიჩინის"] },

  // Meat / poultry
  { id: "chicken", ka: "ქათამი", en: "Chicken", category: "meat_poultry", aliases: ["ქათმის", "chicken breast", "chicken thigh"] },
  { id: "beef", ka: "საქონლის ხორცი", en: "Beef", category: "meat_poultry", aliases: ["საქონლის", "ხორცი"] },
  { id: "pork", ka: "ღორის ხორცი", en: "Pork", category: "meat_poultry", aliases: ["ღორის"] },
  { id: "lamb", ka: "ცხვრის ხორცი", en: "Lamb", category: "meat_poultry", aliases: ["ცხვრის"] },
  { id: "ground_meat", ka: "ფარში", en: "Ground meat", category: "meat_poultry", aliases: ["ფარშის", "ground beef", "mince"] },
  { id: "bacon", ka: "ბეკონი", en: "Bacon", category: "meat_poultry", aliases: ["ბეკონის"] },

  // Fish / seafood
  { id: "salmon", ka: "ორაგული", en: "Salmon", category: "fish_seafood", aliases: ["ორაგულის"] },
  { id: "tuna", ka: "ტუნა", en: "Tuna", category: "fish_seafood", aliases: ["ტუნას", "ტუნის"] },
  { id: "shrimp", ka: "კრევეტი", en: "Shrimp", category: "fish_seafood", aliases: ["კრევეტის", "კრევეტები", "prawn", "prawns"] },

  // Dairy / eggs
  { id: "egg", ka: "კვერცხი", en: "Egg", category: "dairy_eggs", aliases: ["კვერცხის", "eggs"] },
  { id: "milk", ka: "რძე", en: "Milk", category: "dairy_eggs", aliases: ["რძის"] },
  { id: "butter", ka: "კარაქი", en: "Butter", category: "dairy_eggs", aliases: ["კარაქის"] },
  { id: "yogurt", ka: "მაწონი", en: "Yogurt", category: "dairy_eggs", aliases: ["მაწვნის", "იოგურტი", "იოგურტის"] },
  { id: "sour_cream", ka: "არაჟანი", en: "Sour cream", category: "dairy_eggs", aliases: ["არაჟნის"] },
  { id: "sulguni", ka: "სულგუნი", en: "Sulguni", category: "dairy_eggs", aliases: ["სულგუნის"] },
  { id: "feta", ka: "ფეტა", en: "Feta", category: "dairy_eggs", aliases: ["ფეტას", "ფეტის"] },
  { id: "cheese", ka: "ყველი", en: "Cheese", category: "dairy_eggs", aliases: ["ყველის"] },
  { id: "cream", ka: "ნაღები", en: "Cream", category: "dairy_eggs", aliases: ["ნაღების"] },

  // Grains / pasta
  { id: "rice", ka: "ბრინჯი", en: "Rice", category: "grains_pasta", aliases: ["ბრინჯის"] },
  { id: "pasta", ka: "მაკარონი", en: "Pasta", category: "grains_pasta", aliases: ["მაკარონის", "spaghetti", "penne"] },
  { id: "bread", ka: "პური", en: "Bread", category: "grains_pasta", aliases: ["პურის"] },
  { id: "buckwheat", ka: "წიწიბურა", en: "Buckwheat", category: "grains_pasta", aliases: ["წიწიბურის", "გრეჩკა"] },
  { id: "oats", ka: "შვრია", en: "Oats", category: "grains_pasta", aliases: ["შვრიის", "oatmeal"] },

  // Legumes / nuts
  { id: "beans", ka: "ლობიო", en: "Beans", category: "legumes_nuts", aliases: ["ლობიოს"] },
  { id: "lentils", ka: "ოსპი", en: "Lentils", category: "legumes_nuts", aliases: ["ოსპის"] },
  { id: "walnut", ka: "ნიგოზი", en: "Walnut", category: "legumes_nuts", aliases: ["ნიგვზის", "ნიგვრის", "walnuts"] },
  { id: "almond", ka: "ნუში", en: "Almond", category: "legumes_nuts", aliases: ["ნუშის", "almonds"] },

  // Pantry basics
  { id: "salt", ka: "მარილი", en: "Salt", category: "pantry_basics", aliases: ["მარილის"], isBasic: true },
  { id: "black_pepper", ka: "შავი პილპილი", en: "Black pepper", category: "pantry_basics", aliases: ["პილპილი", "პილპილის"], isBasic: true },
  { id: "sugar", ka: "შაქარი", en: "Sugar", category: "pantry_basics", aliases: ["შაქრის"], isBasic: true },
  { id: "oil", ka: "ზეთი", en: "Oil", category: "pantry_basics", aliases: ["ზეთის", "მცენარეული ზეთი", "ზეთისხილის ზეთი", "olive oil", "sunflower oil"], isBasic: true },
  { id: "water", ka: "წყალი", en: "Water", category: "pantry_basics", aliases: ["წყლის"], isBasic: true },
  { id: "flour", ka: "ფქვილი", en: "Flour", category: "pantry_basics", aliases: ["ფქვილის"] },
  { id: "baking_soda", ka: "სოდა", en: "Baking soda", category: "pantry_basics", aliases: ["სოდის"] },
  { id: "yeast", ka: "საფუარი", en: "Yeast", category: "pantry_basics", aliases: ["საფუარის"] },

  // Condiments / sauces
  { id: "vinegar", ka: "ძმარი", en: "Vinegar", category: "condiments_sauces", aliases: ["ძმარის"] },
  { id: "soy_sauce", ka: "სოიოს სოუსი", en: "Soy sauce", category: "condiments_sauces", aliases: ["სოიოს"] },
  { id: "tomato_paste", ka: "ტომატის პასტა", en: "Tomato paste", category: "condiments_sauces", aliases: ["ტომატ-პასტა", "tomato puree"] },
  { id: "tkemali", ka: "ტყემალი", en: "Tkemali", category: "condiments_sauces", aliases: ["ტყემლის"] },
  { id: "adjika", ka: "აჯიკა", en: "Adjika", category: "condiments_sauces", aliases: ["აჯიკის"] },
  { id: "mustard", ka: "მდოგვი", en: "Mustard", category: "condiments_sauces", aliases: ["მდოგვის"] },
  { id: "mayonnaise", ka: "მაიონეზი", en: "Mayonnaise", category: "condiments_sauces", aliases: ["მაიონეზის", "mayo"] },
  { id: "honey", ka: "თაფლი", en: "Honey", category: "condiments_sauces", aliases: ["თაფლის"] },

  // Bakery
  { id: "puff_pastry", ka: "ფენოვანი ცომი", en: "Puff pastry", category: "bakery", aliases: ["ფენოვანი"] },
  { id: "lavash", ka: "ლავაში", en: "Lavash", category: "bakery", aliases: ["ლავაშის"] },

  // Beverages
  { id: "wine", ka: "ღვინო", en: "Wine", category: "beverages", aliases: ["ღვინის"] },
  { id: "coffee", ka: "ყავა", en: "Coffee", category: "beverages", aliases: ["ყავის"] },
  { id: "tea", ka: "ჩაი", en: "Tea", category: "beverages", aliases: ["ჩაის"] },
];

export const PANTRY_CATALOG_BY_ID: Map<string, CatalogItem> = new Map(
  PANTRY_CATALOG.map((item) => [item.id, item]),
);

export const BASIC_ITEM_IDS: Set<string> = new Set(
  PANTRY_CATALOG.filter((item) => item.isBasic).map((item) => item.id),
);
