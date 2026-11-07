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

Dependency on JSZip library:
============================
When dealing with 3mf/vsb files you must use JSZip library - https://stuk.github.io/jszip/
 - this library is not included here, you must upload it to your server and supply jszip_path and jszip_utils_path parameters:
``` 
var stl_viewer=new StlViewer
(
  document.getElementById("stl_cont"),
  {
      ....
      jszip_path:"/<path_to_jszip>/jszip.min.js",
      jszip_utils_path:"/<path_to_jszip>/jszip-utils.min.js"
  }
);
```

more at https://www.viewstl.com/plugin/
