//1.10
function parse_3d_file(filename, s)
{
	//determine type of file
	//console.log(filename.split('.').pop().toLowerCase());
	//switch (filename.split('.').pop().toLowerCase())
	switch (filename.split('.').pop().split('?')[0].toLowerCase())
	{
		case "stl":
			return parse_stl_bin(s);
			break;
		case "obj":
			return parse_obj(s);
			break;
		case "vf":
			return parse_vf(arrayBufferToString(s));
			break;
		default:
			return parse_stl_bin(s);
			//return "Unknown file type";
	}
}

function arrayBufferToString(buffer,onSuccess,onFail)
{
	if (typeof TextDecoder != 'undefined')
		return new TextDecoder("utf-8").decode(buffer);

    var bufView = new Uint8Array(buffer);
    var length = bufView.length;
    var result = '';
    for(var i = 0;i<length;i+=16383)
    {
        var addition = 16383;
        if(i + 16383 > length)
        {
            addition = length - i;
        }
        result += String.fromCharCode.apply(null, bufView.subarray(i,i+addition));
    }

    return result;

}


function parse_stl_ascii (s)
{
	try
	{	
		var stl_string=arrayBufferToString(s);
		
		var vertices=[];
		var faces=[];
		var vert_hash = {};

		stl_string = stl_string.replace(/\r/, "\n");
		stl_string = stl_string.replace(/^solid[^\n]*/, "");
		stl_string = stl_string.replace(/\n/g, " ");
		stl_string = stl_string.replace(/facet normal /g,"");
		stl_string = stl_string.replace(/outer loop/g,"");  
		stl_string = stl_string.replace(/vertex /g,"");
		stl_string = stl_string.replace(/endloop/g,"");
		stl_string = stl_string.replace(/endfacet/g,"");
		stl_string = stl_string.replace(/endsolid[^\n]*/, "");
		stl_string = stl_string.replace(/facet/g,"");
		stl_string = stl_string.replace(/\s+/g, " ");
		stl_string = stl_string.replace(/^\s+/, "");
		
		var facet_count = 0;
		var block_start = 0;
		var vertex;
		var vertexIndex;
		var points = stl_string.split(" ");
		var face_indices=[];
		var len=points.length/12-1;
	    
		for (var i=0; i<len; i++)
		{
			face_indices = [];
			for (var x=0; x<3; x++)
			{
				f1=parseFloat(points[block_start+x*3+3]);
				f2=parseFloat(points[block_start+x*3+4]);
				f3=parseFloat(points[block_start+x*3+5]);
				vertexIndex = vert_hash[ [f1,f2,f3] ];
				if (vertexIndex == null)
				{
					vertexIndex = vertices.length;
					//vertices.push(new THREE.Vector3(f1,f2,f3));
					vertices.push(new Array(f1,f2,f3));
					vert_hash[ [f1,f2,f3] ] = vertexIndex;
				}

				face_indices.push(vertexIndex);
			}
			//faces.push(new THREE.Face3(face_indices[0],face_indices[1],face_indices[2]));
			faces.push(new Array(face_indices[0],face_indices[1],face_indices[2]));
		    
			block_start = block_start + 12;
		}

		return ({vertices:vertices, faces:faces, colors:false});
	}
	catch(err)
	{
		return "Can't parse file";
		//return "ERROR: "+err.message;
	}
	
}

function parse_stl_bin(s)
{
	var vertices=[];
	var faces=[];
	var vert_hash = {};
	var vertexIndex;
	var f1,f2,f3;
	var v1,v2,v3;

	if (!s) return null;

	//see if this is colored STL
	var cpos=arrayBufferToString(s.slice(0,80)).toLowerCase().indexOf("color");
	
	var fdata = new DataView(s, 0);
	var only_default_color=true;
	
	if (cpos>-1)
	{
		//there is a color, get the default color
		def_red_color=(fdata.getUint8 (cpos+6,true)) / 31;
		def_green_color=(fdata.getUint8 (cpos+7,true)) / 31;
		def_blue_color=(fdata.getUint8 (cpos+8,true)) / 31;
	}
	
	
	var pos=80;
	
	try
	{	
		var tcount=fdata.getUint32(pos,true);
	}
	catch(err)
	{
		return "Can't parse file";
		//return "ERROR: "+err.message;
	}		
	
	//check if we're binary or ascii - comparing the actual file size to the "what is written in the file" file size
	var predictedSize = 80 /* header */ + 4 /* count */ + 50 * tcount;
	if (!(s.byteLength == predictedSize)) return parse_stl_ascii(s);
	
	
	try
	{
		
		pos+=4;
		while (tcount--)
		{
			//f1=fdata.getFloat32(pos,true);f2=fdata.getFloat32(pos+4,true);f3=fdata.getFloat32(pos+8,true);
			//n=new THREE.Vector3(f1,f2,f3);
		
			pos+=12;
			
			f1=fdata.getFloat32(pos,true);f2=fdata.getFloat32(pos+4,true);f3=fdata.getFloat32(pos+8,true);
			vertexIndex = vert_hash[ [f1,f2,f3] ];
			if (vertexIndex == null)
			{
				vertexIndex = vertices.length;
				//vertices.push(new THREE.Vector3(f1,f2,f3));
				vertices.push(new Array(f1,f2,f3));
				vert_hash[ [f1,f2,f3] ] = vertexIndex;
			}
			v1=vertexIndex;		
			
			pos+=12;
			
			f1=fdata.getFloat32(pos,true);f2=fdata.getFloat32(pos+4,true);f3=fdata.getFloat32(pos+8,true);
			vertexIndex = vert_hash[ [f1,f2,f3] ];
			if (vertexIndex == null)
			{
				vertexIndex = vertices.length;
				//vertices.push(new THREE.Vector3(f1,f2,f3));
				vertices.push(new Array(f1,f2,f3));
				vert_hash[ [f1,f2,f3] ] = vertexIndex;
			}
			v2=vertexIndex;		

			pos+=12;
			
			f1=fdata.getFloat32(pos,true);f2=fdata.getFloat32(pos+4,true);f3=fdata.getFloat32(pos+8,true);
			vertexIndex = vert_hash[ [f1,f2,f3] ];
			if (vertexIndex == null)
			{
				vertexIndex = vertices.length;
				//vertices.push(new THREE.Vector3(f1,f2,f3));
				vertices.push(new Array(f1,f2,f3));
				vert_hash[ [f1,f2,f3] ] = vertexIndex;
			}
			v3=vertexIndex;		

			if (cpos>-1)
			{
				pos+=12;
				
				//get 2 bytes of color (if any)
				face_color=fdata.getUint16(pos,true);
				
				if ((face_color==32768)||(face_color==65535))
				{
					//default color
					color_red=def_red_color;
					color_green=def_green_color;
					color_blue=def_blue_color;
				}
				else
				{
					only_default_color=false;
					color_red=((face_color & 31)/31);		//0000000000011111
					color_green=(((face_color & 992)>>5)/31);  //0000001111100000
					color_blue=(((face_color & 31744)>>10)/31);	//0111110000000000
					
					//the rgb are saved in values from 0 to 31 ... for us, we want it to be 0 to 1 - hence the 31)
				}
				
				//faces.push(new THREE.Face3(v1,v2,v3,1,new THREE.Color("rgb("+color_red+","+color_green+","+color_blue+")")));
				faces.push(new Array(v1,v2,v3,color_red, color_green,color_blue ));
				
				pos+=2;
			}
			else
			{
				//no color
				//faces.push(new THREE.Face3(v1,v2,v3));
				faces.push(new Array(v1,v2,v3));
				pos+=14;
			}
		}

		vert_hash=null;
	
		//console.log("CPOS: "+cpos+" only default: "+only_default_color);
	
		return ({vertices:vertices, faces:faces, colors:((cpos>-1)&&(!only_default_color))});
	}
	catch(err)
	{
		return "Can't parse file";
		//return "ERROR: "+err.message;
	}
}

function parse_vf(s)
{
	var o=JSON.parse(s);
	
	var vertices=[];
	var faces=[];
	
	try
	{
		var len=o.vertices.length;
		for (i=0;i<len;i++)
			//vertices.push(new THREE.Vector3(o.vertices[i][0],o.vertices[i][1],o.vertices[i][2]));
			vertices.push(new Array(o.vertices[i][0],o.vertices[i][1],o.vertices[i][2]));

		var len=o.faces.length;
		for (i=0;i<len;i++)
			//faces.push(new THREE.Face3(o.faces[i][0],o.faces[i][1],o.faces[i][2]));
			faces.push(new Array(o.faces[i][0],o.faces[i][1],o.faces[i][2]));
		
		return ({vertices:vertices, faces:faces, colors:false});
	}
	catch(err)
	{
		return "Can't parse file";
		//return "ERROR: "+err.message;
	}
	
}

function geo_to_vf(geo)
{
	var vertices=[];
	var faces=[];
	
	var len=geo.vertices.length;
	for (i=0;i<len;i++)
		vertices.push([geo.vertices[i].x,geo.vertices[i].y,geo.vertices[i].z]);

	var len=geo.faces.length;
	for (i=0;i<len;i++)
		faces.push([geo.faces[i].a,geo.faces[i].b,geo.faces[i].c]);
	
	
	return ({vertices:vertices, faces:faces, colors:false});
}

if (!ArrayBuffer.prototype.slice) {
    //Returns a new ArrayBuffer whose contents are a copy of this ArrayBuffer's
    //bytes from `begin`, inclusive, up to `end`, exclusive
    ArrayBuffer.prototype.slice = function (begin, end) {
        //If `begin` is unspecified, Chrome assumes 0, so we do the same
        if (begin === void 0) {
            begin = 0;
        }

        //If `end` is unspecified, the new ArrayBuffer contains all
        //bytes from `begin` to the end of this ArrayBuffer.
        if (end === void 0) {
            end = this.byteLength;
        }

        //Chrome converts the values to integers via flooring
        begin = Math.floor(begin);
        end = Math.floor(end);

        //If either `begin` or `end` is negative, it refers to an
        //index from the end of the array, as opposed to from the beginning.
        if (begin < 0) {
            begin += this.byteLength;
        }
        if (end < 0) {
            end += this.byteLength;
        }

        //The range specified by the `begin` and `end` values is clamped to the 
        //valid index range for the current array.
        begin = Math.min(Math.max(0, begin), this.byteLength);
        end = Math.min(Math.max(0, end), this.byteLength);

        //If the computed length of the new ArrayBuffer would be negative, it 
        //is clamped to zero.
        if (end - begin <= 0) {
            return new ArrayBuffer(0);
        }

        var result = new ArrayBuffer(end - begin);
        var resultBytes = new Uint8Array(result);
        var sourceBytes = new Uint8Array(this, begin, end - begin);

        resultBytes.set(sourceBytes);

        return result;
    };
}


function parse_obj (s)
{
	var obj_string=arrayBufferToString(s);
		
		
		function vector( x, y, z ) {

			//return new THREE.Vector3( parseFloat( x ), parseFloat( y ), parseFloat( z ) );
			return new Array(parseFloat( x ), parseFloat( y ), parseFloat( z ));
			

		}

		function uv( u, v ) {

			//return new THREE.Vector2( parseFloat( u ), parseFloat( v ) );
			return new Array( parseFloat( u ), parseFloat( v ) );

		}

		function face3( a, b, c, normals ) {

			//return new THREE.Face3( a, b, c, normals );
			return new Array( a, b, c, normals );

		}
		
		//var object = new THREE.Object3D();
		//var geometry, material, mesh;

		function parseVertexIndex( index ) {

			index = parseInt( index );

			return index >= 0 ? index - 1 : index + vertices.length;

		}

		function parseNormalIndex( index ) {

			index = parseInt( index );

			return index >= 0 ? index - 1 : index + normals.length;

		}

		function parseUVIndex( index ) {

			index = parseInt( index );

			return index >= 0 ? index - 1 : index + uvs.length;

		}
		
		function add_face( a, b, c, normals_inds ) {
		
			

			//if ( normals_inds === undefined )
			if (1==1)
			{

				//faces.push( new Array (vertices[ parseVertexIndex( a ) ] - 1,vertices[ parseVertexIndex( b ) ] - 1,vertices[ parseVertexIndex( c ) ] - 1));
				
				
				faces.push(new Array (parseVertexIndex( a ), parseVertexIndex( b ), parseVertexIndex( c )));
				
				//geometry.faces.push( face3(
				//
				//	vertices[ parseVertexIndex( a ) ] - 1,
				//	vertices[ parseVertexIndex( b ) ] - 1,
				//	vertices[ parseVertexIndex( c ) ] - 1
				//) );

			} else {

				faces.push( new Array (vertices[ parseVertexIndex( a ) ] - 1,vertices[ parseVertexIndex( b ) ] - 1,vertices[ parseVertexIndex( c ) ] - 1));
				//geometry.faces.push( face3(
					//vertices[ parseVertexIndex( a ) ] - 1,
					//vertices[ parseVertexIndex( b ) ] - 1,
					//vertices[ parseVertexIndex( c ) ] - 1,
					//[
					//	normals[ parseNormalIndex( normals_inds[ 0 ] ) ].clone(),
					//	normals[ parseNormalIndex( normals_inds[ 1 ] ) ].clone(),
					//	normals[ parseNormalIndex( normals_inds[ 2 ] ) ].clone()
					//]
				//) );

			}

		}
		
		function add_uvs( a, b, c ) {
	  
			//geometry.faceVertexUvs[ 0 ].push( [
			//	uvs[ parseUVIndex( a ) ].clone(),
			//	uvs[ parseUVIndex( b ) ].clone(),
			//	uvs[ parseUVIndex( c ) ].clone()
			//] );

		}
		
		function handle_face_line(faces, uvs, normals_inds) {

			if ( faces[ 3 ] === undefined ) {
				
				add_face( faces[ 0 ], faces[ 1 ], faces[ 2 ], normals_inds );
				
				if ( uvs !== undefined && uvs.length > 0 ) {

					add_uvs( uvs[ 0 ], uvs[ 1 ], uvs[ 2 ] );

				}

			} else {
				
				if ( normals_inds !== undefined && normals_inds.length > 0 ) {

					add_face( faces[ 0 ], faces[ 1 ], faces[ 3 ], [ normals_inds[ 0 ], normals_inds[ 1 ], normals_inds[ 3 ] ] );
					add_face( faces[ 1 ], faces[ 2 ], faces[ 3 ], [ normals_inds[ 1 ], normals_inds[ 2 ], normals_inds[ 3 ] ] );

				} else {

					add_face( faces[ 0 ], faces[ 1 ], faces[ 3 ] );
					add_face( faces[ 1 ], faces[ 2 ], faces[ 3 ] );

				}
				
				if ( uvs !== undefined && uvs.length > 0 ) {

					add_uvs( uvs[ 0 ], uvs[ 1 ], uvs[ 3 ] );
					add_uvs( uvs[ 1 ], uvs[ 2 ], uvs[ 3 ] );

				}

			}
			
		}

		// create mesh if no objects in text

		if ( /^o /gm.test( obj_string ) === false ) {

			//geometry = new THREE.Geometry();
			//material = new THREE.MeshLambertMaterial();
			//mesh = new THREE.Mesh( geometry, material );
			//object.add( mesh );

		}

		var vertices = [];
		var normals = [];
		var uvs = [];
		var faces = [];

		// v float float float

		var vertex_pattern = /v( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)/;

		// vn float float float

		var normal_pattern = /vn( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)/;

		// vt float float

		var uv_pattern = /vt( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)/;

		// f vertex vertex vertex ...

		var face_pattern1 = /f( +-?\d+)( +-?\d+)( +-?\d+)( +-?\d+)?/;

		// f vertex/uv vertex/uv vertex/uv ...

		var face_pattern2 = /f( +(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+))?/;

		// f vertex/uv/normal vertex/uv/normal vertex/uv/normal ...

		var face_pattern3 = /f( +(-?\d+)\/(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+)\/(-?\d+))?/;

		// f vertex//normal vertex//normal vertex//normal ... 

		var face_pattern4 = /f( +(-?\d+)\/\/(-?\d+))( +(-?\d+)\/\/(-?\d+))( +(-?\d+)\/\/(-?\d+))( +(-?\d+)\/\/(-?\d+))?/

		//

		var lines = obj_string.split( '\n' );

		for ( var i = 0; i < lines.length; i ++ ) {

			var line = lines[ i ];
			line = line.trim();

			var result;

			if ( line.length === 0 || line.charAt( 0 ) === '#' ) {

				continue;

			} else if ( ( result = vertex_pattern.exec( line ) ) !== null ) {

				// ["v 1.0 2.0 3.0", "1.0", "2.0", "3.0"]

				vertices.push( 
					//geometry.vertices.push(
					//vertices.push(
						vector(
							result[ 1 ], result[ 2 ], result[ 3 ]
						)
					//)
				);

			} else if ( ( result = normal_pattern.exec( line ) ) !== null ) {

				// ["vn 1.0 2.0 3.0", "1.0", "2.0", "3.0"]

				normals.push(
					vector(
						result[ 1 ], result[ 2 ], result[ 3 ]
					)
				);

			} else if ( ( result = uv_pattern.exec( line ) ) !== null ) {

				// ["vt 0.1 0.2", "0.1", "0.2"]

				uvs.push(
					uv(
						result[ 1 ], result[ 2 ]
					)
				);

			} else if ( ( result = face_pattern1.exec( line ) ) !== null ) {

				// ["f 1 2 3", "1", "2", "3", undefined]

				handle_face_line(
					[ result[ 1 ], result[ 2 ], result[ 3 ], result[ 4 ] ]
				);

			} else if ( ( result = face_pattern2.exec( line ) ) !== null ) {

				// ["f 1/1 2/2 3/3", " 1/1", "1", "1", " 2/2", "2", "2", " 3/3", "3", "3", undefined, undefined, undefined]
				
				handle_face_line(
					[ result[ 2 ], result[ 5 ], result[ 8 ], result[ 11 ] ], //faces
					[ result[ 3 ], result[ 6 ], result[ 9 ], result[ 12 ] ] //uv
				);

			} else if ( ( result = face_pattern3.exec( line ) ) !== null ) {

				// ["f 1/1/1 2/2/2 3/3/3", " 1/1/1", "1", "1", "1", " 2/2/2", "2", "2", "2", " 3/3/3", "3", "3", "3", undefined, undefined, undefined, undefined]

				handle_face_line(
					[ result[ 2 ], result[ 6 ], result[ 10 ], result[ 14 ] ], //faces
					[ result[ 3 ], result[ 7 ], result[ 11 ], result[ 15 ] ], //uv
					[ result[ 4 ], result[ 8 ], result[ 12 ], result[ 16 ] ] //normal
				);

			} else if ( ( result = face_pattern4.exec( line ) ) !== null ) {

				// ["f 1//1 2//2 3//3", " 1//1", "1", "1", " 2//2", "2", "2", " 3//3", "3", "3", undefined, undefined, undefined]

				handle_face_line(
					[ result[ 2 ], result[ 5 ], result[ 8 ], result[ 11 ] ], //faces
					[ ], //uv
					[ result[ 3 ], result[ 6 ], result[ 9 ], result[ 12 ] ] //normal
				);

			} else if ( /^o /.test( line ) ) {

				//geometry = new THREE.Geometry();
				//material = new THREE.MeshLambertMaterial();

				//mesh = new THREE.Mesh( geometry, material );
				//mesh.name = line.substring( 2 ).trim();
				//object.add( mesh );

			} else if ( /^g /.test( line ) ) {

				// group

			} else if ( /^usemtl /.test( line ) ) {

				// material

				//material.name = line.substring( 7 ).trim();

			} else if ( /^mtllib /.test( line ) ) {

				// mtl file

			} else if ( /^s /.test( line ) ) {

				// smooth shading

			} else {

				// console.log( "THREE.OBJLoader: Unhandled line " + line );

			}

		}

		//var children = object.children;

		//for ( var i = 0, l = children.length; i < l; i ++ ) {

			//var geometry = children[ i ].geometry;

			//geometry.computeCentroids();
			//geometry.computeFaceNormals();
			//geometry.computeBoundingSphere();

		//}
		
		//return object;
	
	//return ({vertices:geometry.vertices, faces:geometry.faces, colors:false});
	//console.log({vertices:vertices, faces:faces, colors:false});
	return ({vertices:vertices, faces:faces, colors:false});
}
