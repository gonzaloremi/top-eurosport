/**
 * Tops 10 officiels Eurosport des saisons passées (chargés en base s'ils n'y sont pas encore).
 * 2025 : édition familiale (Excel), conforme aux articles Eurosport.
 * 2024 : articles Eurosport « Athlètes de l'année 2024 » ; certaines places (Monde 4 et 6, France 2 et 8-10)
 *        sont reconstituées d'après l'ordre de publication.
 */
export const HISTORY: Record<number, { monde: string[]; france: string[] }> = {
  2025: {
    monde: [
      "Tadej Pogačar", "Armand Duplantis", "Carlos Alcaraz", "Marc Márquez", "Jannik Sinner",
      "Summer McIntosh", "Melissa Jefferson-Wooden", "Ousmane Dembélé", "Pauline Ferrand-Prévot",
      "Sydney McLaughlin-Levrone",
    ],
    france: [
      "Ousmane Dembélé", "Pauline Ferrand-Prévot", "Jimmy Gressier", "Léon Marchand", "Sébastien Ogier",
      "Dalin", "Maxime Grousset", "Louis Bielle-Biarrey", "Julia Simon", "Félix Lebrun",
    ],
  },
  2024: {
    monde: [
      "Léon Marchand", "Tadej Pogačar", "Armand Duplantis", "Simone Biles", "Jannik Sinner",
      "Teddy Riner", "Max Verstappen", "Remco Evenepoel", "Harrie Lavreysen", "Noah Lyles",
    ],
    france: [
      "Léon Marchand", "Teddy Riner", "Antoine Dupont", "Félix Lebrun", "Cassandre Beaugrand",
      "Pauline Ferrand-Prévot", "Joris Daudet", "Victor Wembanyama", "Manon Apithy-Brunet", "Cyprien Sarrazin",
    ],
  },
};
