#!/bin/bash
while [ ! -f "$HOME/.ocean/ocean-contracts/artifacts/ready" ] || [ ! -f "$HOME/.ocean/ocean-c2d/ready" ]; do
  sleep 2
done
#wait for c2d
sleep 10
#cat "barge/start_ocean.log"
ls -lh "${HOME}/.ocean/ocean-contracts/"
ls -lh "${HOME}/.ocean/ocean-contracts/artifacts/"
cat "${HOME}/.ocean/ocean-contracts/artifacts/address.json"
