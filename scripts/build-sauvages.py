#!/usr/bin/env python3
"""
Construit src/data/sauvages.json à partir de l'export "Sauvages de ma rue".

Sortie : une entrée par espèce (rang binôme) observée et ABSENTE du référentiel
InfoFlora-600, au même format que infoflora-600.json pour être consommée par
scaffold-plantes.mjs :

  { "latin_name", "family", "obs", "palier", "source": "sauvages" }

Le `palier` (1/2/3) échelonne l'ajout comme les niveaux 200/400/600 d'InfoFlora :
  palier 1 = espèces fréquentes (obs >= 20)   → à faire en premier
  palier 2 = obs 5..19
  palier 3 = obs < 5 (longue traîne)

Écrit aussi src/data/sauvages-observees.json : tous les binômes observés
(présents OU absents), nom canonique + obs — sert à poser le flag "sauvages"
sur les fiches existantes.

Usage: python3 scripts/build-sauvages.py /tmp/recon.csv
"""
import csv, json, re, sys
from collections import Counter
from pathlib import Path

CSV = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/recon.csv")
ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "src/data/infoflora-600.json"

# Crosswalk référentiel Tela (Nom retenu) -> InfoFlora, quand la même espèce
# existe déjà dans le 600 sous un autre nom. Évite de proposer des doublons et
# permet de flaguer la bonne fiche. Extensible.
SYNONYMS = {
    "Lolium pratense": "Festuca pratensis",
    "Lysimachia arvensis": "Anagallis arvensis",
    "Pilosella officinarum": "Hieracium pilosella",
}

AUTHOR = re.compile(r"^[A-Z(]")

def binomial(name: str):
    name = name.strip()
    if not name:
        return None, None
    t = name.split()
    if len(t) == 1:
        return ("family", t[0]) if t[0].endswith("aceae") else ("genus", t[0])
    sp = t[1]
    if sp in ("div.", "sp.") or AUTHOR.match(sp):
        return "genus", t[0]
    return "species", f"{t[0]} {t[1]}"

def main():
    ref = json.loads(REF.read_text(encoding="utf-8"))
    ref_bin = set()
    for e in ref:
        t = e["latin_name"].split()
        ref_bin.add(f"{t[0]} {t[1]}" if len(t) > 1 else t[0])

    obs = Counter()
    fam_of = {}
    for r in csv.DictReader(CSV.open(encoding="utf-8"), delimiter=";"):
        rg, key = binomial(r.get("Nom retenu", ""))
        if rg != "species":
            continue
        key = SYNONYMS.get(key, key)  # rabattre les synonymes sur le nom InfoFlora
        obs[key] += 1
        fam_of.setdefault(key, (r.get("Famille") or "").strip())

    # tous les binômes observés (canoniques) -> pour le flag "sauvages"
    observees = [
        {"latin_name": k, "family": fam_of[k], "obs": n,
         "in_infoflora": k in ref_bin}
        for k, n in obs.most_common()
    ]
    (ROOT / "src/data/sauvages-observees.json").write_text(
        json.dumps(observees, ensure_ascii=False, indent=2), encoding="utf-8")

    # absentes -> nouvelles fiches à créer
    def palier(n):
        return 1 if n >= 20 else 2 if n >= 5 else 3

    absentes = [
        {"latin_name": k, "family": fam_of[k], "obs": n,
         "palier": palier(n), "source": "sauvages"}
        for k, n in obs.most_common() if k not in ref_bin
    ]
    # tri : nom latin (stable, lisible) ; le palier porte la priorité
    absentes_sorted = sorted(absentes, key=lambda e: e["latin_name"])
    (ROOT / "src/data/sauvages.json").write_text(
        json.dumps(absentes_sorted, ensure_ascii=False, indent=2), encoding="utf-8")

    # bilan
    p = Counter(e["palier"] for e in absentes)
    print(f"Espèces observées (binômes)     : {len(observees)}")
    print(f"  dont présentes dans le 600     : {sum(o['in_infoflora'] for o in observees)}")
    print(f"  dont ABSENTES (nouvelles)      : {len(absentes)}")
    print(f"Paliers des absentes : p1(>=20 obs)={p[1]}  p2(5-19)={p[2]}  p3(<5)={p[3]}")
    print(f"\nÉcrit : src/data/sauvages.json ({len(absentes)} absentes)")
    print(f"Écrit : src/data/sauvages-observees.json ({len(observees)} observées)")
    print(f"Synonymes rabattus sur InfoFlora : {SYNONYMS}")

if __name__ == "__main__":
    main()
