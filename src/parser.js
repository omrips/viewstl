//1.13.1
//1.13.1 support for MagicLab colored-STL method

function parse_3d_file(filename, s, callback, jszip_path)
{
	//determine type of file
	//console.log(filename.split('.').pop().toLowerCase());
	//switch (filename.split('.').pop().toLowerCase())
	var res=null;
	switch (filename.split('.').pop().split('?')[0].toLowerCase())
	{
		case "stl":
			res=parse_stl_bin(s);
			break;

		case "obj":
			res=parse_obj(s);
			break;

		case "vf":
			res=parse_vf(arrayBufferToString(s));
			break;

		case "3mf":
			parse_3mf(s, callback, jszip_path); //async function
			return;

		default:
			res=parse_stl_bin(s);
			//return "Unknown file type";
	}

	if (callback) callback(res);
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
	var color_bit=0;
	var color_method_mt=false; //face colors are encoded Materialise Magics method (othereise it can be Meshlab method)

	if (!s) return null;

	//see if this is colored STL
	var cpos=arrayBufferToString(s.slice(0,80)).toLowerCase().indexOf("color");
	//cpos=true;
	
	var fdata = new DataView(s, 0);
	var have_face_colors=false;
	var def_red_color=-1;
	var def_green_color=-1;
	var def_blue_color=-1;
	
	if (cpos>-1)
	{
		//there is a color (Materialise Magics format), get the default color
		color_method_mt=true;
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

			//color data (if any)
			pos+=12;
			face_color=fdata.getUint16(pos,true);
			//color_bit=color_method_mt?1:(face_color & 1); //0000000000000001 => 1=have face color, 0=nope
			color_bit=color_method_mt?1:((face_color & 32768)>>15); //1000000000000000 => 1=have face color, 0=nope
			//console.log('color_bit', color_bit, face_color);

			if (color_bit)
			{
				if (color_method_mt)
				{
					if ((face_color==32768)||(face_color==65535))
					{
						//default color
						color_red=def_red_color;
						color_green=def_green_color;
						color_blue=def_blue_color;
					}
					else
					{
						have_face_colors=true;
						color_red=((face_color & 31)/31);		//0000000000011111
						color_green=(((face_color & 992)>>5)/31);  //0000001111100000
						color_blue=(((face_color & 31744)>>10)/31);	//0111110000000000
						
						//the rgb are saved in values from 0 to 31 ... for us, we want it to be 0 to 1 - hence the 31)
					}
				}
				else
				{
					//meshlab color format
					have_face_colors=true;
					color_blue=((face_color & 31)/31);		//0000000000011111
					color_green=(((face_color & 992)>>5)/31);  //0000001111100000
					color_red=(((face_color & 31744)>>10)/31);	//0111110000000000
				}

				faces.push(new Array(v1,v2,v3, color_red, color_green, color_blue));
			}
			else
			{
				//no color for face
				//faces.push(new THREE.Face3(v1,v2,v3));
				faces.push(new Array(v1,v2,v3));
				
			}
			pos+=2;		

		}

		vert_hash=null;
	
		return ({vertices:vertices, faces:faces, colors:have_face_colors});
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

//returns if JSZip lib is loaded - if so, returns an instance, otherwise tries to load the lib
function init_zip(skip_load_script, jszip_path)
{
	var zip=null;
	try
	{
		zip = new JSZip();
	}
	catch(err)
	{
		if (skip_load_script) console.log('JSZip is missing', err.message);
		zip=null;
	}	

	if (!zip)
	{
		if (!skip_load_script)
		{
			importScripts(jszip_path);
			return 	init_zip(true, jszip_path); //tries again
		}
	}


	return zip;
}

function parse_3mf(s, callback, jszip_path)
{
	var file_txt=arrayBufferToString(s.slice(0,5));
	if (file_txt=='<?xml')
		return parse_3mf_from_txt(arrayBufferToString(s), callback);

	var zip=init_zip(false, jszip_path);
	if (!zip) return false;

	var found=false;
	zip.loadAsync(s).then(function ()
	{
		var zkeys=Object.keys(zip.files);
		var i=zkeys.length;
		while (i--)
		{
			if (zip.files[zkeys[i]].name=="3D/3dmodel.model")
			{
				found=true;
				zip.files[zkeys[i]].async('text').then(function (fileData)
				{
					return parse_3mf_from_txt(fileData, callback); //'return' because our work in this loop is done
				});
			}
		}

		if (!found)
			callback ("3D/3dmodel.model in 3mf file not found");
	});

}

function parse_3mf_from_txt(s, callback)
{
	var vertices=[];
	var faces=[];

	var vertices_for_build=[];
	var faces_for_build=[];

	var have_colors=false;

	var vertex_pattern = /vertex\s+.*(x|y|z)\s*=\s*([0-9,\.\"\+\-e]+)\s+.*(x|y|z)\s*=\s*([0-9,\.\"\+\-e]+)\s+.*(x|y|z)\s*=\s*([0-9,\.\"\+\-e]+)\s*/i;
	var face_pattern = /triangle\s+.*(v1|v2|v3)\s*=\s*([0-9\"]+)\s+.*(v1|v2|v3)\s*=\s*([0-9\"]+)\s+.*(v1|v2|v3)\s*=\s*([0-9\"]+)\s*(?:pid=([0-9\"]+)\s+)?(?:p[1|2|3]=([0-9\"]+)\s)?\s*/i;
	var res_pattern = /(?:m:\S+|basematerials)\s+id=([0-9\"]+)\s*/i;
	var res_color_pattern=/(?:m:(\S+)|base)\s+.*color=([0-9A-F\"\#]+)\s*/i;
	//var object_pattern = /<object\s+.*type=model.*/i;
	var object_pattern = /<object\s+/i;
	var component_pattern = /<component\s+.*objectid=([0-9\"]+)/i;
	var item_transform_pattern = /item\s+.*objectid=([0-9\"]+)\s+.*transform=(([0-9\".e-]+\s+){12})/i;
	var resources={};
	var objects={};
	var curr_object=null;
	var curr_rid=0; //current resource id
	var vcounter=0; //vertices counter
	var fcounter=0; //faces counter
	var build_open_pattern=/<build/i;
	var build_close_pattern=/<\/build/i;
	var build_item_pattern=/<item\s+.*objectid=([0-9\"]+)/i;
	var lines = s.split(/[\r\n]+/g);
	if (lines.length<5)
		lines = s.split(/(?=<)/g); //files without new line, can happen
	var build_stage=false;
	
	for ( var i = 0; i < lines.length; i ++ )
	{
		var line = lines[ i ];
		line = line.replace(/"/g, '');
		//console.log(line);

		var res=vertex_pattern.exec( line );
		if ( res ) 
		{
			var v={x:0,y:0,z:0};
			v[res[1]]=res[2];
			v[res[3]]=res[4];
			v[res[5]]=res[6];
			vertices.push([v.x, v.y, v.z]);
			vcounter++;
			continue;
		}

		var res=face_pattern.exec( line );
		if ( res ) 
		{
			var f={v1:0,v2:0,v3:0};
			var face_color=null;
			var v_start_index=curr_object?curr_object.v_start_index:0;

			f[res[1]]=parseInt(res[2])+v_start_index;
			f[res[3]]=parseInt(res[4])+v_start_index;
			f[res[5]]=parseInt(res[6])+v_start_index;

			//maybe a color from face the itself??
			if (typeof res[7] !== "undefined")
				if (resources[res[7]])
					if (typeof res[8] !== "undefined")
						if (resources[res[7]])
							if (resources[res[7]].color)
								if (resources[res[7]].color[res[8]])
									face_color=resources[res[7]].color[res[8]].substr(1);
			
			//maybe a color from the object??
			if ((!face_color)&&(curr_object))
			{
				if (typeof curr_object.pid !== "undefined")
					if (typeof curr_object.pindex !== "undefined")
						if (resources[curr_object.pid])
							if (resources[curr_object.pid].color)
								if (resources[curr_object.pid].color[curr_object.pindex])
									face_color=resources[curr_object.pid].color[curr_object.pindex].substr(1);
			}

			if (face_color)
			{
				have_colors=true;
				face_color={red:parseInt(face_color.substr(0,2),16)/255, green:parseInt(face_color.substr(2,2),16)/255, blue:parseInt(face_color.substr(4,2),16)/255};
				faces.push([f.v1, f.v2, f.v3, face_color.red, face_color.green, face_color.blue]);
			}
			else
				faces.push([f.v1, f.v2, f.v3]);
			
			fcounter++;
			continue;
		}

		var res=res_pattern.exec( line );
		if ( res ) 
		{
			curr_rid=res[1];
			if (!resources[curr_rid]) resources[curr_rid]={};
			
			continue;
		}
		
		var res=component_pattern.exec( line );
		if ( res ) 
		{
			//console.log('component patterns: ',JSON.stringify(objects[res[1]]), res[1]);
			if (!curr_object) continue;
			if (!objects[res[1]]) continue;

			//add new vertices to current vertices array
			//console.log('old vertices', JSON.stringify(vertices));
			vertices=vertices.concat(JSON.parse(JSON.stringify(vertices.slice(objects[res[1]].v_start_index, objects[res[1]].v_end_index+1)))); //the JSON is for a deep-copy, array of arrays can be tricky to just slice

			//has transform?
			var tres=/transform=(([0-9\".e-]+\s+){12})/i.exec( line );
			if (tres)
			{
				var tsplit=tres[1].trim().split(/[ ,]+/);
				if (tsplit.length==12)
				{
					var to_iv=vertices.length-1;
					var from_iv=to_iv-(objects[res[1]].v_end_index-objects[res[1]].v_start_index);					
					transform_vertices(vertices, from_iv, to_iv, tsplit);
				}
			}

			//console.log('new vertices', JSON.stringify(vertices));

			//add new faces to current faces array
			var new_faces=JSON.parse(JSON.stringify(faces.slice(objects[res[1]].f_start_index, objects[res[1]].f_end_index+1))); //the JSON is for a deep-copy, array of arrays can be tricky to just slice
			var vgap=vertices.length-objects[res[1]].v_end_index-1;
			var findex=new_faces.length;
			while (findex--)
			{
				new_faces[findex][0]+=vgap;
				new_faces[findex][1]+=vgap;
				new_faces[findex][2]+=vgap;
			}

			//console.log('old faces', JSON.stringify(faces));
			faces=faces.concat(new_faces);
			//console.log('new faces', JSON.stringify(faces));

			vcounter=vertices.length;
			fcounter=faces.length;

			continue;
		}

		var res=object_pattern.exec( line );
		if ( res ) 
		{
			var res=/id=([0-9\"]+)/i.exec( line );if (!res) continue;
			if (curr_object) curr_object.v_end_index=vcounter-1;
			if (curr_object) curr_object.f_end_index=fcounter-1;

			var new_object={};
			new_object.id=res[1];
			new_object.v_start_index=vcounter; //ref to the complete vertices array
			new_object.f_start_index=fcounter; //ref to the complete faces array

			var res=/pid=([0-9\"]+)/i.exec( line );
			if (res) new_object.pid=parseInt(res[1]);

			var res=/pindex=([0-9\"]+)/i.exec( line );
			if (res) new_object.pindex=parseInt(res[1]);
			
			//console.log(JSON.stringify(curr_object));
			//var old_id=curr_object?curr_object.id:null;
			curr_object=new_object; //just changing reference
			//console.log(old_id?JSON.stringify(objects[old_id]):'NA');
			objects[curr_object.id]=curr_object;
			//console.log(curr_object.id, objects[curr_object.id]); 

			//console.log ('********* new object', JSON.stringify(curr_object));

			continue;
		}

		var res=res_color_pattern.exec( line );
		if ( res ) 
		{
			if (typeof res[1] === "undefined") res[1]="color"; //this is color of basematerials peoperty
			if (!resources[curr_rid]) {console.log('warning: no source id for '+res[1]);continue;}
			if (!resources[curr_rid][res[1]]) resources[curr_rid][res[1]]=[];
			
			resources[curr_rid][res[1]].push(res[2]);
			
			continue;
		}

		if (build_open_pattern.exec( line ))
		{
			build_stage=true;
			continue;
		}

		if (build_close_pattern.exec( line ))
		{
			build_stage=false;
			continue;
		}
		
		if (!build_stage) continue; //if not in build stage, we finished checking this row

		var res=build_item_pattern.exec(line);
		if (res)
		{
			//console.log('build', res[1], JSON.stringify(objects));

			//if (res[1]==128) continue; //*** REMOVE ME

			if (!objects[res[1]]) continue;

			var end_inx=(typeof objects[res[1]].v_end_index === "undefined")?(vcounter-1):objects[res[1]].v_end_index;

			var res2=item_transform_pattern.exec(line);
			if ( res2 ) 
			{
				var tsplit=res2[2].trim().split(/[ ,]+/);
				if (tsplit.length==12)
					transform_vertices(vertices, objects[res2[1]].v_start_index, end_inx, tsplit);
			}

			
			vertices_for_build=vertices_for_build.concat(vertices.slice(objects[res[1]].v_start_index, end_inx+1));
			var vgap=vertices_for_build.length-end_inx-1;
			//console.log('vgap', vgap);


			var end_inx=(typeof objects[res[1]].f_end_index === "undefined")?(fcounter-1):objects[res[1]].f_end_index;
			//console.log('bulding from faces',objects[res[1]].f_start_index, end_inx);
			var new_faces=JSON.parse(JSON.stringify(faces.slice(objects[res[1]].f_start_index, end_inx+1))); //need a deep copy, so we won't change the old faces array
			var findex=new_faces.length;
			while (findex--)
			{
				new_faces[findex][0]+=vgap;
				new_faces[findex][1]+=vgap;
				new_faces[findex][2]+=vgap;
			}
			faces_for_build=faces_for_build.concat(new_faces);

			continue;
		}


	}

	//console.log('vertices: ', JSON.stringify(vertices));
	//console.log('vertices for build: ', JSON.stringify(vertices_for_build));
	//console.log('faces: ', JSON.stringify(faces));
	//console.log('faces for build: ', JSON.stringify(faces_for_build));
	//console.log('resources: ', JSON.stringify(resources));
	//console.log('objects: ', JSON.stringify(objects));
	//return;

	callback({vertices:vertices_for_build, faces:faces_for_build, colors:have_colors});
	
}

function transform_vertices(vertices, from_iv, to_iv, tsplit) //transform vertices by matrix, used by parse_3mf_from_txt
{
	var tvals=[[],[],[],[]];
	for (var itval=0;itval<3;itval++) tvals[0][itval]=parseFloat(tsplit[itval]);tvals[0].push(0);
	for (var itval=3;itval<6;itval++) tvals[1][itval-3]=parseFloat(tsplit[itval]);tvals[1].push(0);
	for (var itval=6;itval<9;itval++) tvals[2][itval-6]=parseFloat(tsplit[itval]);tvals[2].push(0);
	for (var itval=9;itval<12;itval++) tvals[3][itval-9]=parseFloat(tsplit[itval]);tvals[3].push(1);
	//console.log('transform', tvals);
	
	for (var iv=from_iv;iv<=to_iv;iv++)
	{
		//console.log('before mul', JSON.stringify(vertices[iv]));
		var transform=matrix_multiply([vertices[iv].concat(1)], tvals);
		vertices[iv]=[transform[0][0],transform[0][1],transform[0][2]];
		//console.log('after mul', JSON.stringify(vertices[iv]));
	}
}

function matrix_multiply(a, b)
{
	console.log()
	var aNumRows = a.length, aNumCols = a[0].length,
		bNumRows = b.length, bNumCols = b[0].length,
		m = new Array(aNumRows);  // initialize array of rows
	for (var r = 0; r < aNumRows; ++r) {
	  m[r] = new Array(bNumCols); // initialize the current row
	  for (var c = 0; c < bNumCols; ++c) {
		m[r][c] = 0;             // initialize the current cell
		for (var i = 0; i < aNumCols; ++i) {
		  m[r][c] += a[r][i] * b[i][c];
		}
	  }
	}
	return m;
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
