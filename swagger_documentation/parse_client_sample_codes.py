import json

from lxml import html
from lxml.etree import tostring


def get_api_operation_id(name):
    name = name[: len(name) - 2]
    name = name[name.rfind("-") + 1 :]
    return name


sample_code = {}

with open("clients_generated_samples/index.html", "r") as f:
    page = f.read()
tree = html.fromstring(page)
sections = tree.get_element_by_id("sections")
for section in sections.findall("section"):
    for div in section.findall("div/article"):
        operationId = get_api_operation_id(div.attrib["id"])
        nav_tab = div.find_class("nav-tabs-examples")[0]
        tab_content = div.find_class("tab-content")[0]
        sample_code[operationId] = (tostring(nav_tab).decode(), tostring(tab_content).decode())


with open("sample_code.json", "w") as outfile:
    json.dump(sample_code, outfile)
