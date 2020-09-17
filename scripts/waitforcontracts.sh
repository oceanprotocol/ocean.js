if [ "${DEPLOY_CONTRACTS}" = "true" ]; then
  while [ ! -f "${HOME}/.ocean/ocean-contracts/artifacts/ready" ]; do
    sleep 2
  done
fi
