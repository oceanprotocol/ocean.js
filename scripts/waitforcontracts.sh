#!/bin/bash
while [ ! -f "$HOME/.ocean/ocean-contracts/artifacts/ready" ] ; do
  sleep 2
done
docker logs ocean_kindcluster_1 --follow &
docker logs ocean_computetodata_1 --follow &

while [ ! -f "$HOME/.ocean/ocean-contracts/artifacts/ready" ] || [ ! -f "$HOME/.ocean/ocean/c2d/ready" ]; do
  echo "Waiting for barge to spin up..."
  [ -f "$HOME/.ocean/ocean-contracts/artifacts/ready" ] && echo "Contracts ready.."
  [ -f "$HOME.ocean/ocean/c2d/ready" ] && echo "C2d ready.."
  sleep 2
done
cat "barge/start_ocean.log"
ls -lh "${HOME}/.ocean/ocean-contracts/"
ls -lh "${HOME}/.ocean/ocean-contracts/artifacts/"
cat "${HOME}/.ocean/ocean-contracts/artifacts/address.json"
