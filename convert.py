import os
import re

# Chemin vers tes fichiers (adapte si nécessaire)
PATH = "./src/content/flore/plantes/"

def convert_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # On sépare le Frontmatter (entre les ---) et le contenu
    parts = content.split('---')
    if len(parts) < 3:
        return
    
    old_yaml = parts[1]
    body = '---'.join(parts[2:])

    # Extraction des valeurs avec REGEX
    def get_val(key):
        match = re.search(fr'^{key}:\s*(.*)$', old_yaml, re.MULTILINE)
        if match:
            val = match.group(1).strip().strip('"').strip("'")
            # On retourne une liste car ton nouveau format veut des tableaux []
            return f'["{val}"]' if val else "[]"
        return None

    # On récupère les infos de base
    common = re.search(r'^nom_fr:\s*(.*)$', old_yaml, re.MULTILINE)
    latin = re.search(r'^nom_sci:\s*(.*)$', old_yaml, re.MULTILINE)
    image = re.search(r'^image_ref:\s*(.*)$', old_yaml, re.MULTILINE)

    new_yaml = f"""---
common_name: "{common.group(1).strip() if common else 'Sans nom'}"
latin_name: "{latin.group(1).strip() if latin else 'Inconnu'}"
appareil_vegetatif:
  tige_port: {get_val('tige_port') or '[]'}
  tige_section: {get_val('tige_section') or '[]'}
  tige_aspect: {get_val('tige_aspect') or '[]'}
  feuilles_insertion: {get_val('feuilles_insertion') or '[]'}
  feuilles_composition: {get_val('feuilles_composition') or '[]'}
inflorescence:
  type_structure: {get_val('fleur_type') or '[]'}
image_ref: {image.group(1).strip() if image else '""'}
---"""

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_yaml + body)
    print(f"✅ Converti : {filepath}")

# Exécution
if os.path.exists(PATH):
    for filename in os.listdir(PATH):
        if filename.endswith(".md"):
            convert_file(os.path.join(PATH, filename))
else:
    print(f"❌ Dossier {PATH} non trouvé")

