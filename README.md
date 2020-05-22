# Viewstl
Javascript STL/OBJ 3D files Viewer

Reads binary/ASCII STL files; OBJ files

Uses THREE.js lib - Can load THREE.js lib files in the background (no need to deal with THREE JS at all)

Usage:
================
At the html page header / page body:
```
<script src="stl_viewer.min.js"></script>
```

At the page body, create an element to contain the Stl Viewer, and give it an ID:
```
<div id="stl_cont"></div>
```

Create a new instance of Stl Viewer (simplest initiation - read and view STL file called 'mystl.stl'):
```
var stl_viewer=new StlViewer(document.getElementById("stl_cont"), { models: [ {id:0, filename:"mystl.stl"} ] });
```

more at https://www.viewstl.com/plugin/
