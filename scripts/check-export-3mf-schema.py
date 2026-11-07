"""Optional independent XSD check, using the official specification appendices.

Read 3mf-core-spec.txt, 3mf-materials-spec.txt and W3C xml.xsd downloaded into
test-results/exports. Requires lxml; does not fetch resources or upload models.
"""
from pathlib import Path
import re
import zipfile
from lxml import etree

root = Path("test-results/exports").resolve()
xs = "http://www.w3.org/2001/XMLSchema"
core_ns = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02"
materials_ns = "http://schemas.microsoft.com/3dmanufacturing/material/2015/02"

for name in ("core", "materials"):
    text = (root / f"3mf-{name}-spec.txt").read_text(encoding="utf-8-sig")
    source = re.search(r"<xs:schema\b[\s\S]*?</xs:schema>", text).group(0)
    schema = etree.fromstring(source.encode())
    # libxml2 2.11 rejects INT_MAX as maxOccurs. A stricter one-million cap
    # preserves validation for these tiny fixtures without loosening the schema.
    for item in schema.iter():
        if item.get("maxOccurs") == "2147483647":
            item.set("maxOccurs", "1000000")
        # The published Materials appendix has type=" ST_Numbers"; normalize
        # the QName's surrounding whitespace so libxml2 can compile it.
        if item.get("type"):
            item.set("type", item.get("type").strip())
    for item in schema.findall(f"{{{xs}}}import"):
        namespace = item.get("namespace")
        if namespace == "http://www.w3.org/XML/1998/namespace":
            item.set("schemaLocation", "xml.xsd")
        elif namespace == core_ns:
            item.set("schemaLocation", "core.xsd")
    if name == "core":
        schema.insert(0, etree.Element(f"{{{xs}}}import", namespace=materials_ns, schemaLocation="materials.xsd"))
    etree.ElementTree(schema).write(str(root / f"{name}.xsd"), encoding="utf-8", xml_declaration=True)

schema = etree.XMLSchema(etree.parse(str(root / "core.xsd")))
with zipfile.ZipFile(root / "colored-scene.3mf") as archive:
    schema.assertValid(etree.fromstring(archive.read("3D/3dmodel.model")))
print("3MF model validates against official Core and Materials XSD appendices (stricter one-million occurrence cap for libxml2).")
