#!/bin/bash
# Serveur de supervision "legacy" de Roseval (status.roseval.local).
# Le shebang pointe vers le bash 4.3 vulnérable : ce CGI est exposé à Shellshock
# (CVE-2014-6271) car Apache recopie les en-têtes HTTP dans l'environnement avant
# de lancer bash.
echo "Content-type: text/plain"
echo ""
echo "Roseval - serveur de supervision (legacy)"
echo "Statut : en ligne"
echo "Heure  : $(date)"
