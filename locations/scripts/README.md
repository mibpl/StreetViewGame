Scripts to generate the data for "Locations" mode.

It uses pipenv to setup Python environment. To use first install dependencies
with:

```
pipenv install
```

Example run of `convert_geojson_to_final.py`:

```
pipenv run python convert_geojson_to_final.py \
  ../data/raw/continents-of-the-world.geojson ../data/continents/ \
  --index_file_location ../data/index.json \
  --input_name_property continent \
  --type continent \
  --outputs_prefix continents
```
