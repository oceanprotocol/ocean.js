while [ ! -f "${HOME}/.ocean/ocean-contracts/artifacts/ready" ]; do
  sleep 2
done

cat "barge/start_ocean.log"
ls -lh "${HOME}/.ocean/ocean-contracts/"
ls -lh "${HOME}/.ocean/ocean-contracts/artifacts/"
cat "${HOME}/.ocean/ocean-contracts/artifacts/address.json"
