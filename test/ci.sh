node test/adjust-by-scheduling

if [ $(node -v | cut -f1 -d. | cut -f2 -dv) -lt 10 ]; then
  npm install --no-save humanize-ms@^1.2.1
  node test/old-node-test
else
  npm i -g fyn
  fyn
  fun coverage
fi
