#!/usr/bin/env python3
"""
Analyse l'export "Sauvages de ma rue" (Tela Botanica / IdentiPlante) :
- espèces les plus observées (sur le "Nom retenu", normalisé en binôme)
- comparaison avec le référentiel InfoFlora (src/data/infoflora-600.json)

Usage: python3 scripts/analyse-sauvages.py /chemin/vers/export.csv
"""
import csv, json, re, sys
from collections import Counter
from pathlib import Path

CSV_PATH = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/recon.csv")
REF_PATH = Path(__file__).resolve().parent.parent / "src/data/infoflora-600.json"

# --- normalisation d'un nom latin vers le binôme (Genre espèce) ---
AUTHOR_TOKEN = re.compile(r"^[A-Z(]")  # un token "auteur" commence par maj ou (
RANK_WORDS = {"subsp.", "var.", "f.", "proles", "subvar.", "convar."}

def to_binomial(name: str):
    """Renvoie (rang, cle). rang: 'family'|'genus'|'species'."""
    name = name.strip()
    if not name:
        return None, None
    toks = name.split()
    g = toks[0]
    # rang famille : un seul mot finissant en -aceae/-ae
    if len(toks) == 1:
        if g.endswith("aceae"):
            return "family", g
        return "genus", g
    sp = toks[1]
    # genre + "div. sp." ou genre + auteur seul -> genre
    if sp in ("div.", "sp.", "L.", "Mill.", "DC.") or AUTHOR_TOKEN.match(sp):
        return "genus", g
    return "species", f"{g} {sp}"

def main():
    rows = []
    with CSV_PATH.open(encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f, delimiter=";"):
            rows.append(r)

    species = Counter()
    families = Counter()
    rank_counts = Counter()
    for r in rows:
        rang, cle = to_binomial(r.get("Nom retenu", ""))
        if not cle:
            continue
        rank_counts[rang] += 1
        if rang == "species":
            species[cle] += 1
        fam = (r.get("Famille") or "").strip()
        if fam:
            families[fam] += 1

    # référentiel InfoFlora -> set de binômes
    ref = json.loads(REF_PATH.read_text(encoding="utf-8"))
    ref_bin = set()
    for e in ref:
        toks = e["latin_name"].split()
        if len(toks) >= 2:
            ref_bin.add(f"{toks[0]} {toks[1]}")
        else:
            ref_bin.add(toks[0])

    obs_species = set(species)
    in_ref = obs_species & ref_bin
    not_in_ref = obs_species - ref_bin

    print(f"Lignes (observations)        : {len(rows)}")
    print(f"Répartition par rang du nom retenu : {dict(rank_counts)}")
    print(f"Espèces (binômes) distinctes : {len(obs_species)}")
    print(f"Familles distinctes          : {len(families)}\n")

    print("=== TOP 25 espèces les plus observées ===")
    for name, n in species.most_common(25):
        flag = "✓" if name in ref_bin else "✗ absent du 600"
        print(f"{n:5d}  {name:<42} {flag}")

    print("\n=== TOP 12 familles ===")
    for fam, n in families.most_common(12):
        print(f"{n:5d}  {fam}")

    print(f"\n=== COMPARAISON avec InfoFlora-600 ===")
    print(f"Espèces observées présentes dans le 600 : {len(in_ref)}")
    print(f"Espèces observées ABSENTES du 600       : {len(not_in_ref)}")
    cov = 100 * len(in_ref) / len(obs_species) if obs_species else 0
    print(f"Couverture du terrain par votre 600     : {cov:.1f}%")
    ref_observed = len(ref_bin & obs_species)
    print(f"(Sur vos 600 fiches, {ref_observed} apparaissent sur le terrain)")

    print("\n=== Espèces ABSENTES du 600, classées par nb d'observations ===")
    print("(candidates prioritaires à ajouter — vues souvent mais pas dans vos fiches)")
    missing_ranked = sorted(not_in_ref, key=lambda s: -species[s])
    for name in missing_ranked[:30]:
        print(f"{species[name]:5d}  {name}")
    print(f"... ({len(missing_ranked)} espèces absentes au total)")

if __name__ == "__main__":
    main()
