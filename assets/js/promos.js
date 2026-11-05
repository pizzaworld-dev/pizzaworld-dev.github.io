/* ==========================================================================
   PROMOTIONS DU MOMENT · Pizza World Cagnes-sur-Mer
   --------------------------------------------------------------------------
   C'est le seul fichier à modifier pour gérer vos promos. Elles s'affichent
   toutes seules : section « Promotions » de l'accueil, bandeau défilant en
   haut des pages et haut de la carte. S'il n'y a plus aucune promo active,
   la section et le lien « Promos » du menu disparaissent.

   AJOUTER une promo : copiez le MODÈLE (du { jusqu'au }, compris), collez-le
   dans la liste, puis changez les textes entre guillemets.
   ENLEVER une promo : supprimez son bloc { … }, ou écrivez  actif: false
   pour la garder de côté sans l'afficher (true pour la remettre).

   Les champs :
     actif    true = affichée, false = cachée
     titre    l'offre, en quelques mots
     quand    quand elle s'applique (facultatif)
     details  les conditions (facultatif)
     bandeau  texte court pour le bandeau défilant (facultatif, sinon le titre)
     du, au   dates de début et de fin, ex. "01/11/2026" (facultatif) :
              la promo apparaît le premier jour et disparaît après le dernier.
              Laissez "" pour une promo sans date.

   Gardez les guillemets "…" autour des textes et la virgule après chaque }.
   ========================================================================== */
var PROMOS = [

  {
    actif: true,
    titre: "1 pizza achetée = 1 boisson offerte",
    quand: "Le midi, du lundi au vendredi, de 11h30 à 13h30",
    details: "",
    bandeau: "Le midi : 1 pizza achetée = 1 boisson offerte",
    du: "",
    au: ""
  },

  // MODÈLE à copier. Il ne s'affiche pas (actif: false).
  {
    actif: false,
    titre: "Titre de la promo",
    quand: "Quand elle s'applique",
    details: "Les conditions de l'offre.",
    bandeau: "",
    du: "",
    au: ""
  },

];
