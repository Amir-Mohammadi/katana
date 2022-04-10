# Katana

## How to install

1. clone the project to your local computer
```bash
git clone --branch master http://95.80.182.57:5003/parlar/katana.git
```

2. install yarn from [yarn install](https://classic.yarnpkg.com/en/docs/install)

3. use the yarn inside the project directory to install the dependency
```bash
yarn
```

3. use yarn build to build the project.
```bash
yarn build
```
4. use the yarn link to link the CLI to your terminal 
```bash
yarn link
```


## How to use the CLI tool
The next command will show the times for the username "shekari" and print all issue and merge requests with the label "Dey  99"
```bash
kat report -c -l "Dey  99" -m "1400-W21" -u shekari
kat log -u shekari
```

