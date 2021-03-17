<!--
Copyright 2021 Ocean Protocol Foundation
SPDX-License-Identifier: Apache-2.0
-->

# On Config Parameters

We can set any config parameter (a) via an envvar, or (b) via a config file. Envvar values override config file values.

An `Ocean` instance will hold a `Config` instance that holds various config parameters. These parameters need to get set. This is set based on what's input to `Ocean` constructor:

1.  dict input: `Ocean({'network':..})`
2.  Config object input: `Ocean(Config('config.ini'))`
3.  no input, so it uses CONFIG_FILE envvar

Here are examples.

## 1. dict input, filled from envvars

First, in console:

```console
export NETWORK_URL=https://rinkeby.infura.io/v3/<your Infura project id>
export AQUARIUS_URL=https://aquarius.rinkeby.oceanprotocol.com
export PROVIDER_URL=https://provider.rinkeby.oceanprotocol.com
```

For legacy support, you can also use `metadataStoreUri` instead of `metadataCacheUri`.

## 1a. Unsetting envvars

Recall that parameters set by envvars override config file values. So, to use a config value in a file, we must remove its envvar.

Here's how. In the console:

```console
    unset NETWORK_URL AQUARIUS_URL PROVIDER_URL
```

## 2. Config object input, filled from config file

First, in your working directory, create `config.ini` file and fill as follows:

```console
    [eth-network]
    network = https://rinkeby.infura.io/v3/<your infura project id>

    [resources]
    aquarius.url = https://provider.rinkeby.oceanprotocol.com
    provider.url = https://aquarius.rinkeby.oceanprotocol.com
```


## 3. No input, so it uses CONFIG_FILE envvar

We'll use the `config.ini` file created from the previous example.

Then, set an envvar for the config file. In the console:

```console
export CONFIG_FILE=config.ini
```

