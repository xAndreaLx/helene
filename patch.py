import os
import re

PATH = "./src/content/flore/plantes/"

def clean_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    in_frontmatter = False
    count = 0
    
    for line in lines:
        # On détecte le début et la fin du frontmatter
        if line.strip() == "---":
            count += 1
            in_frontmatter = (count == 1)
            new_lines.append("---\n")
            continue
        
        # Si on est dans le frontmatter, on supprime les espaces au début de la ligne
        if in_frontmatter and count < 2:
            new_lines.append(line.lstrip())
        else:
            new_lines.append(line)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f"✅ Corrigé : {filepath}")

if os.path.exists(PATH):
    for filename in os.listdir(PATH):
        if filename.endswith(".md"):
            clean_file(os.path.join(PATH, filename))
else:
    print(f"❌ Dossier non trouvé : {PATH}")

