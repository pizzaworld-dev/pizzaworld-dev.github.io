/* ==========================================================================
   ALLERGÈNES · Pizza World Cagnes-sur-Mer
   --------------------------------------------------------------------------
   Remplit le tableau des allergènes en bas de la carte (rubrique « Allergènes »).

   ⚠ À VÉRIFIER AVANT LA MISE EN LIGNE. Ce tableau a été préparé à partir des
   recettes de la carte. Contrôlez chaque ligne avec votre recette de pâte et de
   sauce, et avec les étiquettes ou fiches techniques de vos fournisseurs
   (charcuteries, viandes préparées, produits panés, sauces, desserts, glaces).
   Une erreur peut mettre un client allergique en danger.

   Un « ? » devant un allergène veut dire « à vérifier » : après contrôle,
   gardez l'allergène sans le « ? », ou supprimez-le.
   Quand tout est vérifié, mettez  verifie: true  : le bandeau « tableau en
   cours de vérification » disparaît du site, et un allergène encore marqué
   « ? » est alors affiché comme présent, par précaution.

   Les 14 allergènes, à écrire tels quels : gluten, crustacés, œufs, poissons,
   arachides, soja, lait, fruits à coque, céleri, moutarde, sésame, sulfites,
   lupin, mollusques.
   Gardez les guillemets "…" et les virgules entre les éléments.
   ========================================================================== */
var ALLERGENES = {

  verifie: false,

  // Base de chaque famille de plats (vérifiez aussi votre sauce tomate)
  base: {
    pizza: ["gluten"],        // pâte : farine de blé
    bruschetta: ["gluten"]    // pain
  },

  // Ingrédients des pizzas et bruschettas : un plat reprend les allergènes de chaque
  // ingrédient dont le nom figure dans sa description sur la carte.
  // Un ingrédient absent de cette liste ne contient aucun allergène.
  ingredients: {
    "mozzarella": ["lait"],
    "crème": ["lait"],
    "bleu": ["lait"],
    "cantal": ["lait"],
    "cheddar": ["lait"],
    "chèvre": ["lait"],
    "raclette": ["lait"],
    "camembert": ["lait"],
    "œuf": ["œufs"],
    "anchois": ["poissons"],
    "thon": ["poissons"],
    "saumon": ["poissons"],
    "fruits de mer": ["?crustacés", "?mollusques"],
    "jambon": ["?lait"],
    "chorizo": ["?lait"],
    "merguez": ["?sulfites"],
    "kebab": ["?gluten", "?œufs", "?lait", "?soja", "?céleri", "?moutarde"],
    "tenders": ["?gluten", "?œufs", "?lait", "?céleri", "?moutarde"],
    "curry": ["?céleri", "?moutarde"],
    "ketchup": ["?céleri"],
    "épices mexicaines": ["?céleri", "?moutarde"],
    "câpres": ["?sulfites"],
    "artichauts": ["?sulfites"],
    "coco râpé": ["?sulfites"]
  },

  // Plats sans liste d'ingrédients : menus enfant, Tex-Mex, desserts, boissons
  // (le nom doit être celui de la carte)
  plats: {
    "Menu Batman": ["gluten", "lait", "?œufs", "?soja"],
    "Menu enfant": ["?gluten", "?œufs", "?lait", "?soja", "?céleri", "?moutarde"],

    "Chicken Wings": ["?gluten", "?soja", "?céleri", "?moutarde"],
    "Chicken Nuggets": ["?gluten", "?céleri", "?moutarde"],
    "Stick Mozza": ["lait", "?gluten", "?œufs"],
    "Onion Rings": ["?gluten", "?lait"],
    "Chili Cheese Nuggets": ["lait", "?gluten"],
    "Jalapeños": ["lait", "?gluten"],
    "Tenders": ["?gluten", "?œufs", "?lait", "?céleri", "?moutarde"],
    "Menu Tender": ["?gluten", "?œufs", "?lait", "?céleri", "?moutarde"],
    "Mix Tex-Mex": ["lait", "?gluten", "?œufs", "?soja", "?céleri", "?moutarde"],
    "Frites": [],
    "Potatoes": ["?gluten"],

    "Brownie": ["gluten", "œufs", "lait", "?fruits à coque", "?soja"],
    "Tiramisu": ["gluten", "œufs", "lait"],
    "Pizza Nutella": ["gluten", "lait", "fruits à coque", "soja"],
    "Glace Häagen-Dazs": ["lait", "œufs", "?gluten", "?fruits à coque", "?soja"],
    "Glace Magnum": ["lait", "?soja", "?fruits à coque"],
    "Gaufre": ["gluten", "œufs", "lait", "?fruits à coque", "?soja"],

    "Softs 33 cl": [],
    "Grands formats": [],
    "Eaux": [],
    "Bières 33 cl": ["gluten"],
    "Vins": ["sulfites"]
  },

  // Sauces servies avec le Tex-Mex
  sauces: {
    "Ketchup": ["?céleri"],
    "Mayonnaise": ["œufs", "?moutarde"],
    "Barbecue": ["?gluten", "?céleri", "?moutarde", "?sulfites"]
  }
};
