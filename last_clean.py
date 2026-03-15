import os
import re

PATH = "./src/content/flore/plantes/"

def clean_yaml(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Supprime les doubles guillemets doubles ""Texte"" -> "Texte"
    content = content.replace('""', '"')

    # 2. Sépare le frontmatter du reste
    parts = re.split(r'^---+\s*$', content, flags=re.MULTILINE)
    
    if len(parts) >= 3:
        frontmatter = parts[1]
        body = "---".join(parts[2:])
        
        lines = frontmatter.strip().split('\n')
        new_lines = []
        
        for i, line in enumerate(lines):
            clean_line = line.strip()
            if not clean_line: continue
            
            # Correction spécifique pour l'inflorescence qui n'est pas indentée
            if clean_line.startswith("type_structure:"):
                new_lines.append("  " + clean_line)
            # Garder l'indentation existante pour appareil_vegetatif
            elif ":" not in clean_line or clean_line.startswith("- "):
                new_lines.append("  " + clean_line)
            elif any(x in clean_line for x in ["tige_", "feuilles_", "racine_"]):
                # Si la ligne précédente était 'appareil_vegetatif:', on indente
                new_lines.append("  " + clean_line)
            else:
                new_lines.append(clean_line)

        # 3. Réécriture propre (sans espaces après les ---)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write("---\n")
            f.write("\n".join(new_lines))
            f.write("\n---\n")
            f.write(body.lstrip())
        print(f"✅ Nettoyé : {filepath}")

if os.path.exists(PATH):
    for filename in os.listdir(PATH):
        if filename.endswith(".md"):
            clean_yaml(os.path.join(PATH, filename))

