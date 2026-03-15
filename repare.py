import os
import re

PATH = "./src/content/flore/plantes/"

def repair_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # On sépare le frontmatter (entre les ---) et le reste
    parts = re.split(r'^---+\s*$', content, flags=re.MULTILINE)
    
    if len(parts) >= 3:
        frontmatter = parts[1]
        body = "---".join(parts[2:]) # Le reste du texte (en dessous du 2ème ---)
        
        lines = frontmatter.strip().split('\n')
        new_frontmatter = []
        
        for line in lines:
            # On nettoie les espaces inutiles au début tout en gardant 
            # une indentation relative de 2 espaces pour les sous-éléments
            stripped = line.strip()
            if not stripped: continue
            
            # Si la ligne ne commence pas par un mot-clé suivi de ":", 
            # c'est probablement un sous-élément (comme - "Dressée")
            if ":" not in stripped or stripped.startswith("- "):
                new_frontmatter.append("  " + stripped)
            elif stripped.startswith("tige_") or stripped.startswith("feuille_") or stripped.startswith("racine_"):
                 # On indente les sous-catégories connues de l'appareil végétatif
                new_frontmatter.append("  " + stripped)
            else:
                new_frontmatter.append(stripped)

        # On réécrit le fichier proprement
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write("---\n")
            f.write("\n".join(new_frontmatter))
            f.write("\n---\n")
            f.write(body.lstrip())
        print(f"✨ Réparé : {filepath}")

if os.path.exists(PATH):
    for filename in os.listdir(PATH):
        if filename.endswith(".md"):
            repair_file(os.path.join(PATH, filename))

