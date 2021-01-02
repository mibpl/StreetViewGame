"""Convert a single Geojson file to the format understood by StreetViewGame.

This expects that the input file contains a FeatureCollection.
The output format is as follows:
 * each shape is in its own file
 * index.json file has names for all shapes and links to their files
 * "properties" section of each shape has:
   - name
   - area
   - type (eg. continent)
 * each shape has the bbox property.
"""
import area as geojson_area
import argparse
import dataclasses
import geojson
import json
import os

from typing import Dict, List, Sequence

parser = argparse.ArgumentParser(description='Convert single Geojson file '
                                 'into format recognized by StreetViewGame')

parser.add_argument('input_file',
                    help='Location of the Geojson file to process.',
                    type=str)
parser.add_argument('output_dir',
                    help='Location where to write all resulting shape files.',
                    type=str)
parser.add_argument('--index_file_location',
                    help='Location of the index.json file to append to.',
                    required=True,
                    type=str)
parser.add_argument('--outputs_prefix',
                    help=('The prefix to put in index.json file for each '
                          'shape.'),
                    default='',
                    type=str)
parser.add_argument('--input_name_property',
                    help=('Which of the existing properties to treat as the '
                          'name of the shape.'),
                    default='name',
                    type=str)
parser.add_argument('--type',
                    help='What type to give to all resulting shapes.',
                    required=True,
                    type=str)


def load_geojson_and_verify(path: str) -> geojson.feature.FeatureCollection:
  with open(path) as geojson_file:
    geojson_obj = geojson.load(geojson_file)
  if type(geojson_obj) != geojson.feature.FeatureCollection:
    raise ValueError('Input file should contain FeatureCollection at its root '
                     f'but it contains {type(geojson_obj)}.')
  return geojson_obj


@dataclasses.dataclass
class IndexEntry:
  relative_path: str


@dataclasses.dataclass
class ProcessedShapes:
  index: Dict[str, IndexEntry]
  shapes: List[geojson.feature.Feature]


# Since points are stored as a list of two elements, the resulting array will
# contain y values every second element and x values on the other places.
def flatten_coords(coords):
  for val in coords:
    if isinstance(val, list):
      for subval in flatten_coords(val):
        yield subval
    else:
      yield val


def bbox_for_feature(feature: geojson.feature.Feature) -> Sequence[float]:
  flat_coords = list(flatten_coords(feature['geometry']['coordinates']))
  x_values = flat_coords[::2]
  y_values = flat_coords[1::2]
  # bbox is [min_x, min_y, max_x, max_y]
  return [min(x_values), min(y_values), max(x_values), max(y_values)]


def area_for_feature(feature: geojson.feature.Feature) -> float:
  coordinates_list = feature['geometry']['coordinates']
  if feature['type'] == 'Polygon':
    coordinates_list = [coordinates_list]

  area = 0
  for coords in coordinates_list:
    area += geojson_area.polygon__area(coords)
  return area


def feature_filename(
    feature: geojson.feature.Feature,
) -> str:
  return feature['properties']['name'].replace(' ', '_') + '.json'


def process_features(
    feature_collection: geojson.feature.FeatureCollection,
    name_property: str,
    type_name: str,
    outputs_prefix: str,
) -> ProcessedShapes:
  index = {}
  shapes = []
  for feature in feature_collection['features']:
    name = feature['properties'][name_property]
    if name in index:
      raise ValueError(f'Shape of name {name} appears multiple times in the '
                       'input file.')

    feature['bbox'] = bbox_for_feature(feature)
    feature['properties'] = {
        'name': name,
        'area': area_for_feature(feature),
        'type': type_name,
    }
    shapes.append(feature)

    index[name] = IndexEntry(
        relative_path=os.path.join(outputs_prefix, feature_filename(feature)))
  return ProcessedShapes(index=index, shapes=shapes)


def write_processed(
    processed: ProcessedShapes,
    index_file_path: str,
    out_dir: str,
):
  with open(index_file_path) as index_file:
    index_json_dict = json.loads(index_file.read())

  for name, index_entry in processed.index.items():
    if name in index_json_dict:
      raise ValueError(f'Shape of name {name} already exists in index.json.')
    index_json_dict[name] = {'relative_path': index_entry.relative_path}

  with open(index_file_path, 'w') as index_file:
    index_file.write(json.dumps(index_json_dict))

  for feature in processed.shapes:
    out_filename = os.path.join(out_dir, feature_filename(feature))
    with open(out_filename, 'w') as shape_file:
      shape_file.write(geojson.dumps(feature))


def main():
  args = parser.parse_args()
  feature_collection = load_geojson_and_verify(args.input_file)
  processed = process_features(
      feature_collection,
      args.input_name_property,
      args.type,
      args.outputs_prefix)
  write_processed(processed, args.index_file_location, args.output_dir)


if __name__ == "__main__":
  main()
