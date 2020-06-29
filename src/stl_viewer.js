//1.10
//**********************************************************
//New in 1.10 => Option to trigger 'no model' click event - 'send_no_model_click_event'
//New in 1.10 => Scale always 1 for vsb file, ro avoid double scalling
//New in 1.10 => define default path for loading THREE JS files by script path (and not by html page path) - thanks venkyr!
//New in 1.10 => get both onmousedown + onmouseclick
//New in 1.10 => fix rotation issues
//New in 1.09 => get_camera_state - get camera's info
//New in 1.09 => set_camera_state - set camera

//New in 1.09 => Returns 'orig_filename' optional parameter at 'get_model_info'
//New in 1.09 => 'get_vsj' - returns object current stands as json, files not included
//New in 1.09 => 'download_vsj' - download json descriptor of current scene
//New in 1.09 => 'load_vsj' - apply scene as described in json file
//New in 1.09 => 'get_stl_bin' - returns STL formatted model as arraybuffer
//New in 1.09 => 'download_model' - download model as STL file
//New in 1.09 => 'get_vsb' - returns object current stands as json, plus binary files
//New in 1.09 => 'download_vsb' - download vsb (see get_vsb) as ZIP file
//New in 1.09 => 'load_vsb' - load vsb file

//New in 1.08 => Returns x/y/z dimentions of a model on 'get_model_info'
//New in 1.08 => Fixed finding file extention, thanks Rafael!
//**********************************************************
var stl_viewer_script_path="";

function StlViewer(parent_element_obj, options)
{
	if (!parent_element_obj) console.log ('error: no parent element');

	var _this=this;

	this.error=null; //will contain error string, if any

	this.options=options;
	
	this.parent_element=parent_element_obj;	

	this.get_opt = function (opt_id, def)
	{
		if (!_this.options) return def;
		
		if (_this.options[opt_id]===false) return false;
		return _this.options[opt_id]?_this.options[opt_id]:def;
	}
	
	this.canvas_width="100%";
	this.canvas_height="100%";
	this.bg_color="transparent";
	this.models_to_add=null; //at start
	this.models=new Array();
	this.models_count=0;
	this.models_ref=new Array(); //models with index - direct reference from id(comes from user) to model array (above)
	this.allow_drag_and_drop=_this.get_opt("allow_drag_and_drop",true);
	this.model_loaded_callback=null;
	this.all_loaded_callback=null;
	this.load_error_callback=null;
	this.loading_progress_callback=null;
	this.max_model_id=0; //what is the maximum id of any model?
	this.load_status=new Array(); //loaded/total bytes info for each model
	this.load_session=0; //usefull in more than one session of loading
	this.loaded_models_arr=new Array(); //contain ids of loaded models
	this.status=0; //0=all good
	this.onmousedown_callback=null;
	this.zoom=-1; //-1 = auto zoom
	this.camerax=0;
	this.cameray=0;
	this.cameraz=0;
	this.camera_state=null;
	this.auto_rotate=false;
	this.mouse_zoom=true;
	//this.load_three_files=_this.get_opt("load_three_files","");
	this.load_three_files=_this.get_opt("load_three_files", stl_viewer_script_path);
	this.ready=(typeof THREE != 'undefined');
	this.ready_callback=null;
	this.auto_resize=true;
	this.on_model_drop=null;
	this.center_models=true;
	this.controls_type=0; //0=orbitcontrols, 1=trackbacllcontrols
	this.zoom=-1;
	this.pre_loaded_ab_files=null; //STL files as ArrayBuffer, waiting to be loaded (used when loading VSB)
	this.pre_loaded_vsj=null; //VSJ file content, waiting to be loaded (used when loading VSB)
	this.zip_load_count=-1; //Zip files waiting to be loaded to memory (used when loading VSB)
	this.send_no_model_click_event=false; //will trigger click event even if no model was clicked (just parent element was clicked)
	
	this.set_on_model_mousedown = function (callback)
	{
		_this.onmousedown_callback=callback;
		
		if (_this.onmousedown_callback)
		{
			_this.parent_element.addEventListener('mousedown', _this.onmousedown);
			_this.parent_element.addEventListener('touchstart', _this.onmousedown);
		}
	}
	
	this.set_drag_and_drop = function(b)
	{
		if (b)
		{
			_this.parent_element.addEventListener('dragover', _this.handleDragOver);
			_this.parent_element.addEventListener('drop', _this.handleFileDrop);		
		}
		else
		{
			_this.parent_element.removeEventListener('dragover', _this.handleDragOver);
			_this.parent_element.removeEventListener('drop', _this.handleFileDrop);		
		}
	}
	
	this.set_options = function ()
	{
		_this.canvas_width=_this.get_opt("width",_this.canvas_width);
		_this.canvas_height=_this.get_opt("height",_this.canvas_height);
		_this.bg_color=_this.get_opt("bgcolor",_this.bg_color);
		_this.models_to_add=_this.get_opt("models",_this.models_to_add);
		_this.model_loaded_callback=_this.get_opt("model_loaded_callback",_this.model_loaded_callback);
		_this.all_loaded_callback=_this.get_opt("all_loaded_callback",_this.all_loaded_callback);
		_this.load_error_callback=_this.get_opt("load_error_callback",_this.load_error_callback);
		_this.loading_progress_callback=_this.get_opt("loading_progress_callback",_this.loading_progress_callback);
		_this.onmousedown_callback=_this.get_opt("on_model_mousedown", _this.onmousedown_callback);
		if (!_this.onmousedown_callback) _this.onmousedown_callback=_this.get_opt("on_model_mouseclick",null);
		_this.send_no_model_click_event=_this.get_opt("send_no_model_click_event", _this.send_no_model_click_event);
		_this.zoom=_this.get_opt("zoom",_this.zoom); //-1 = auto zoom
		_this.camerax=_this.get_opt("camerax",_this.camerax);
		_this.cameray=_this.get_opt("cameray",_this.cameray);
		_this.auto_rotate=_this.get_opt("auto_rotate",_this.auto_rotate);
		_this.mouse_zoom=_this.get_opt("mouse_zoom",_this.mouse_zoom);
		_this.ready_callback=_this.get_opt("ready_callback",null);
		_this.auto_resize=_this.get_opt("auto_resize",_this.auto_resize);
		_this.on_model_drop=_this.get_opt("on_model_drop",_this.on_model_drop);
		_this.center_models=_this.get_opt("center_models",_this.center_models);
		_this.controls_type=_this.get_opt("controls", _this.controls_type);
		if (_this.zoom>=0)
			_this.cameraz=_this.zoom;
		else
			_this.cameraz=_this.get_opt("cameraz",_this.cameraz);
		
		_this.camera_state=_this.get_opt("camera_state",_this.camera_state);
			
		//drag and drop?
		if (_this.allow_drag_and_drop)
			_this.set_drag_and_drop(true);
			
		//_this.set_on_model_mousedown(_this.onmousedown_callback);
	}
	
	_this.is_ie = !!window.MSStream;
	

	//messages	
	this.MSG2WORKER_DATA=0;
	this.MSG2WORKER_LOAD=1;
	this.MSG2WORKER_ERROR=2;
	this.MSGFROMWORKER_STL_LOADED=3;
	this.MSGFROMWORKER_LOAD_IN_PROGRESS=4;
	
	this.load_model = function (model)
	{
		_this.max_model_id=Math.max(_this.max_model_id, model.id);
		if ((model.filename)||(model.local_file)) return _this.load_from_stl_file(model, false);
		if (model.mesh) return _this.add_from_existing_mesh(model);
		_this.models_count--; //WTF? no good model
	}
	
	this.add_from_existing_mesh = function(model)
	{
		_this.set_model_custom_props(model); //position, color, scale
		model.mesh.model_id=model.id; //loop-back link (useful to detect clicks)
		//_this.set_geo_minmax(model.mesh.geometry);
		_this.set_geo_minmax(model);
		_this.recalc_dims(model);
		
		model.color=model.mesh.material.color.getHexString();
		
		_this.scene.add(model.mesh);
		_this.model_loaded(model.id);
		_this.check_loading_status(model, 0, 0);
		if (!model.mesh.geometry.boundingBox) model.mesh.geometry.computeBoundingBox();
		
		if (_this.model_loaded_callback)
			_this.model_loaded_callback(model.id);
	}

	this.load_from_stl_file = function (model)
	{
		var model_worker=new Worker(((typeof _this.load_three_files == "string")?_this.load_three_files:"")+"load_stl.min.js");
		//var model_worker=new Worker(((typeof _this.load_three_files == "string")?_this.load_three_files:"")+"load_stl.js");
		model_worker.onmessage = function(e)
		{
			//console.log("msg from worker: ");
			//console.log(e.data);
			switch (e.data.msg_type)
			{
				case _this.MSGFROMWORKER_STL_LOADED:
					model.colors=e.data.colors;
					var geo=_this.vf_to_geo(e.data.vertices, e.data.faces, e.data.colors?e.data.colors:false);
					if (geo)
					{
						//if (!geo.boundingBox) geo.computeBoundingBox();
						var material=new THREE.MeshLambertMaterial({color:0x909090, overdraw: 1, wireframe: false, vertexColors: model.color?THREE.NoColors:THREE.FaceColors}); //if model color is set, ignores face colors set on the STL file itself (if any)
						if (!_this.is_ie) material.side = THREE.DoubleSide;
						if (!model.display) model.display="flat";
						_this.set_material_display(model.display, material, geo); //shading (aka display)
						model.mesh=new THREE.Mesh(geo, material);
						_this.set_model_custom_props(model); //position, color, scale
						_this.set_geo_minmax(model);
						model.mesh.model_id=model.id; //loop-back link (useful to detect clicks)
						_this.recalc_dims(model);
						_this.scene.add(model.mesh);
						_this.model_loaded(model.id);
						if (_this.model_loaded_callback)
							_this.model_loaded_callback(model.id);
					}
					else
						console.log("Error VF data ");
						
						
					model_worker.terminate();
					model_worker=undefined;
					if (_this.pre_loaded_ab_files) if (model.filename) if (_this.pre_loaded_ab_files[model.filename]) delete (_this.pre_loaded_ab_files[model.filename]);
					break;
					
				case _this.MSGFROMWORKER_LOAD_IN_PROGRESS:
					_this.check_loading_status(model, e.data.loaded, e.data.total);
					break;
					
				case _this.MSG2WORKER_ERROR:
					//console.log('Loading error', _this.load_error_callback);
					_this.models_count--; //one less model to load in this session
					_this.model_error("ERROR: "+e.data.data, _this.load_error_callback);
					if (_this.pre_loaded_ab_files) if (model.filename) if (_this.pre_loaded_ab_files[model.filename]) delete (_this.pre_loaded_ab_files[model.filename]);
					break;
			}
		};

		model.bytes_loaded=0;
		model.bytes_total=0;
		
		var blob_to_load=null;
		if (_this.pre_loaded_ab_files) if (model.filename) if (_this.pre_loaded_ab_files[model.filename]) blob_to_load=_this.pre_loaded_ab_files[model.filename];
		
		model_worker.postMessage({msg_type:_this.MSG2WORKER_DATA, data:model, load_from_blob_or_ab:blob_to_load, get_progress:(_this.loading_progress_callback!=null)});
		model_worker.postMessage({msg_type:_this.MSG2WORKER_LOAD});
	
	}
	
	//called after model is loaded
	this.model_loaded = function(model_id)
	{
		_this.loaded_models_arr[model_id]=1;
		
		if (Object.keys(_this.loaded_models_arr).length>=_this.models_count)
		{
			//all models are loaded
			if (!_this.camera_state)
				_this.set_zoom(); //camera state overrides zoom
			else
				_this.camera_state=null; //it is one time thingy (next bunch of models will have to set camera state again)
			
			_this.set_light();
		
			_this.load_session++; //from now on it is a new loading session
			
			if (_this.all_loaded_callback)
			{
				_this.all_loaded_callback();
			}
		}
	}
	
	this.remove_model = function(model_id)
	{
		if (_this.models_ref[model_id]===undefined) return _this.model_error("remove_model - id not found: "+model_id);
	
		var model=_this.models[_this.models_ref[model_id]];
		if (!model) return;
		
		delete _this.models[_this.models_ref[model_id]];
		delete _this.models_ref[model_id];
		delete _this.loaded_models_arr[model_id];
		
		//recalc max_model_id
		_this.max_model_id=-1;
		Object.keys(_this.models_ref).forEach(function(key)
		{
			_this.max_model_id=Math.max(_this.models[_this.models_ref[key]].id, _this.max_model_id);
		});
		
		_this.models_count=Object.keys(_this.models).length;
		
		_this.scene.remove(model.mesh);
	}
	
	//called after set of models were loaded
	this.zoom_done=false;
	this.set_zoom=function (zoom, force_zoom)
	{
		if (zoom) _this.zoom=zoom;
		
		if ((_this.zoom_done)&&(!force_zoom)&&(_this.zoom>=0)) //don't do zoom for more than once
			return;
			
		_this.zoom_done=true;
		
		var max_dim = Math.max(_this.maxx*2, _this.maxy*2, _this.maxz);
			_this.camera.position.set(_this.camera.position.x,_this.camera.position.y,_this.zoom>=0?_this.zoom:(max_dim*1.2*Math.max(1,_this.camera.aspect/2))); //-1 = auto zoom
	}
	
	//position, up and target vectors (each 3 coors vector) described camera's position
	this.get_camera_state=function()
	{
		if (!_this.camera) return null;
		var vpos=new THREE.Vector3();
		var vup=new THREE.Vector3();
		var vtarget=new THREE.Vector3(0,0,0);
		vpos.copy(_this.camera.position);
		vup.copy(_this.camera.up);
		
		if (_this.controls)
			vtarget.copy(_this.controls.target);

		return {position:vpos, up:vup, target:vtarget}
	}
	
	//state{position, up, target} = x,y,z object/vector
	//all parameters are optionals
	this.set_camera_state=function (state)
	{
		if (!_this.camera) return null;
		if (!state) return _this.model_error("set_camera_state - no state vector");
		
		if (state.position!==undefined)
		{
			if (state.position.x===undefined) return _this.model_error("set_camera_state - invalid position x");
			if (state.position.y===undefined) return _this.model_error("set_camera_state - invalid position y");
			if (state.position.z===undefined) return _this.model_error("set_camera_state - invalid position z");
			_this.camera.position.set(state.position.x, state.position.y, state.position.z);
		}
		
		if (state.up!==undefined)
		{
			if (state.up.x===undefined) return _this.model_error("set_camera_state invalid up x");
			if (state.up.y===undefined) return _this.model_error("set_camera_state invalid up y");
			if (state.up.z===undefined) return _this.model_error("set_camera_state invalid up z");
			_this.camera.up.set(state.up.x, state.up.y, state.up.z);
		}
		
		if (!_this.controls) return;
		
		if (state.target!==undefined)
		{
			if (state.target.x===undefined) return _this.model_error("set_camera_state - invalid target x");
			if (state.target.y===undefined) return _this.model_error("set_camera_state - invalid target y");
			if (state.target.z===undefined) return _this.model_error("set_camera_state - invalid target z");
			_this.controls.target.set(state.target.x, state.target.y, state.target.z);
		}
	}

	this.set_center_models=function (b)
	{
		_this.center_models=b;
	}

	
	//called after set of models were loaded
	this.set_light=function()
	{
		_this.directionalLight.position.x = _this.maxy * 2;
		_this.directionalLight.position.y = _this.miny * 2;
		_this.directionalLight.position.z = _this.maxz * 2;

		_this.pointLight.position.x = (_this.miny+_this.maxy)/2;
		_this.pointLight.position.y = (_this.miny+_this.maxy)/2;
		_this.pointLight.position.z = _this.maxz * 2;
	}
	
	this.stop_auto_zoom=function ()
	{
		_this.zoom=_this.camera.position.z;
	}	
	
	this.set_camera=function (x,y,z)
	{
		if (y) _this.zoom=y;
		_this.camera.position.set(!_this.is_empty(x)?x:_this.camera.position.x,!_this.is_empty(y)?y:_this.camera.position.y,_this.zoom>=0?_this.zoom:Math.max(_this.maxx*3, _this.maxy*3, _this.maxz*3.5));
	}
	
	this.set_auto_zoom=function()
	{
		_this.set_zoom(-1);
	}
	
	//go over ALL models for loaded/total status
	this.check_loading_status=function(model, loaded, total)
	{
		if (model)
			_this.load_status[model.id]={loaded:loaded, total:total, load_session:_this.load_session};
			
		if (!_this.loading_progress_callback) return; //no callback, we're done here
		
		//console.log(Object.keys(_this.load_status).length,_this.models_count);
		
		//if every model (loaded and pending) has loading status - send a message to parent
		if (Object.keys(_this.load_status).length==_this.models_count)
			_this.loading_progress_callback(_this.load_status, _this.load_session);
	}
	
	this.set_edges = function(model_id, b)
	{
		if (_this.models_ref[model_id]===undefined) return _this.model_error("set_edges - id not found: "+model_id);
	
		var model=_this.models[_this.models_ref[model_id]];
		if (!model) return;
		
		_this.set_or_update_geo_edges (model, b);
	}
	
	this.set_or_update_geo_edges = function (model, b, force_geo_recalc)
	{
		if ((!b)||(force_geo_recalc))
		{
			if (model.edges)
				_this.scene.remove(model.edges);
			
			model.edges=null;
			
			if (!b) return;
		}
	
		var add_to_scene=false;
		force_geo_recalc=force_geo_recalc||false;
		if ((!model.edges)||(force_geo_recalc))
		{
			//no edges - create new
			var geo=model.mesh.geometry;
			model.edges = new THREE.LineSegments( new THREE.EdgesGeometry( geo ), _this.edges_material );
			add_to_scene=true;
		}

		//position
		if (model.x||model.y||model.z)
			model.edges.position.set(model.x?model.x:0, model.y?model.y:0, model.z?model.z:0);

		//rotation
		model.edges.rotation.setFromRotationMatrix(model.mesh.matrix);
		
		if (add_to_scene) //add only if not already added
			_this.scene.add( model.edges );
	}
	
	//set model custome properties
	this.set_model_custom_props = function (model)
	{
		//position
		model.x=model.x?model.x:0;
		model.y=model.y?model.y:0;
		model.z=model.z?model.z:0;
		model.mesh.position.set(model.x, model.y, model.z);
		
		//color
		if (model.color)
		{
			//color for whole mesh
			_this.update_mesh_color(model.mesh, model.color, false);
		}
		else if (model.colors)
			//custome colors for each face - default 'whole' body color should be white
			_this.update_mesh_color(model.mesh, "#FFFFFF", true);

		//rotation
		model.rotationx=model.rotationx?(model.rotationx):0;
		model.rotationy=model.rotationy?(model.rotationy):0;
		model.rotationz=model.rotationz?(model.rotationz):0;
		if (model.rotationx||model.rotationy||model.rotationz)
			_this.set_rotation(model.id, model.rotationx, model.rotationy, model.rotationz);
		
		//scale
		var scale=(typeof model.scale !== 'undefined')?model.scale:1;
		var scalex=(typeof model.scalex !== 'undefined')?model.scalex:scale;
		var scaley=(typeof model.scaley !== 'undefined')?model.scaley:scale;
		var scalez=(typeof model.scalez !== 'undefined')?model.scalez:scale;
		model.scalex=scalex;
		model.scaley=scaley;
		model.scalez=scalez;
		
		if ((scalex!=1)||(scaley!=1)||(scalez!=1))
			_this.scale_geo(model,scalex,scaley,scalez);
		
		//view edges?
		if (model.view_edges)
			_this.set_or_update_geo_edges (model, true);
			
		//opacity
		if (model.opacity)
			this.set_material_opacity(model.mesh.material, model.opacity);
			
		//animation
		if (model.animation)
			_this.animation[model.id]=1;
	}
	
	this.set_scale = function(model_id, scalex, scaley, scalez)
	{
		if (_this.models_ref[model_id]===undefined) return _this.model_error("set_scale - id not found: "+model_id);
	
		var model=_this.models[_this.models_ref[model_id]];
		if (!model) return;
		if (!model.mesh) return;
		if (!model.mesh.geometry) return;
		
		var prev_scalex=Math.max(model.scalex,0.01);
		var prev_scaley=Math.max(model.scaley,0.01);
		var prev_scalez=Math.max(model.scalez,0.01);
		
		if (scalex) model.scalex=Math.max(scalex,0.01);
		model.scaley=Math.max(scaley?scaley:scalex,0.01);
		model.scalez=Math.max(scalez?scalez:scalex,0.01);
		
		_this.scale_geo(model,model.scalex/prev_scalex,model.scaley/prev_scaley,model.scalez/prev_scalez);
		
		//if model has edges - we need to update it
		if (model.edges)
			_this.set_or_update_geo_edges (model, true, true);
			
		//console.log(model.scalex+"/"+model.scaley+"/"+model.scalez);
	}
	
	this.scale_geo = function(model,scalex,scaley,scalez)
	{
		var geo=model.mesh.geometry;
		geo.scale(scalex,scaley,scalez);
	}
	
	//recalc whole scene dims, and reset camera - after adding new geometry to scene
	this.recalc_dims = function (model)
	{
		var geo=model.mesh.geometry;
		
		_this.maxx=_this.maxx?(Math.max(_this.maxx, geo.maxx+model.x)):geo.maxx+model.x;
		_this.maxy=_this.maxy?(Math.max(_this.maxy, geo.maxy+model.y)):geo.maxy+model.y;
		_this.maxz=_this.maxz?(Math.max(_this.maxz, geo.maxz+model.z)):geo.maxz+model.z;
		_this.minx=_this.maxx?(Math.min(_this.minx, geo.minx+model.x)):geo.minx+model.x;
		_this.miny=_this.maxy?(Math.min(_this.miny, geo.miny+model.y)):geo.miny+model.y;
		_this.minz=_this.maxz?(Math.min(_this.minz, geo.minz+model.z)):geo.minz+model.z;
	}
	
	//set mesh color according to 'color' var
	this.update_mesh_color = function(mesh, color, model_colors)
	{
		if (mesh==null) return;
		
		if (color=='transparent')
		{
			mesh.traverse( function ( object ) { object.visible = false; } );
			return;
		}
		
		mesh.traverse( function ( object ) { object.visible = true; } );
		
		mesh.material.vertexColors=model_colors?THREE.FaceColors:THREE.NoColors; //use model original face colors (from STL file)?  or user defined color (aka NoColors to specific faces)
		if ((model_colors) && (!color)) color='#FFFFFF';
		
		//console.log(color, model_colors);		
		
		if (color)
			mesh.material.color.set(parseInt(color.substr(1),16));
		
		mesh.material.needsUpdate=true;
	}
	
	//set color - called from outside
	this.set_color = function(model_id, color)
	{
		//console.log(_this.models_ref, model_id, _this.models_ref, _this.models, _this.models[0], _this.models_ref[model_id]);
		if (_this.models_ref[model_id]===undefined) return _this.model_error("set_color - id not found: "+model_id);
	
		var model=_this.models[_this.models_ref[model_id]];
		if (!model) return;
		if (!model.mesh) return;
		
		model.color=color;
		
		_this.update_mesh_color(model.mesh, color, color?false:model.colors);
	}	
	
	//check for error in model syntax
	this.error_in_model = function(model)
	{
		if ((!model.id)&&(model.id!=0)&&(model.id!=-1)) return _this.model_error("missing id");
		if (!Number.isInteger(model.id)) return _this.model_error("invalid id");
		if (model.id<-1) return _this.model_error("id must be positive");
		if ((!model.filename) && (!model.mesh) && (!model.local_file))
		{
			if (model.name)
				model.filename=model.name;
			else
				return _this.model_error("missing filename or mesh");
		}
		if (_this.models_ref[model.id]) return _this.model_error ("such model ID already exists: "+model.id);
		return null;
	}
	
	this.model_error = function (s, callback)
	{
		console.log(s);
		_this.status=-1;
		_this.error=s;
		
		if (callback)
			callback(s);
		
		return s;
	}
	
	this.set_bg_color = function (bg_color)
	{
		if (bg_color=='transparent')
			this.renderer.setClearColor(0x000000, 0);
		else
			this.renderer.setClearColor(bg_color, 1);
	}

	this.set_display = function(model_id, display)
	{
		if (_this.models_ref[model_id]===undefined) return _this.model_error("set_display - id not found: "+model_id);
	
		var model=_this.models[_this.models_ref[model_id]];
		if (!model) return;
		
		_this.set_material_display(display, model.mesh.material, model.mesh.geometry);
		model.display=display;
		
		if (model.mesh)
			model.mesh.normalsNeedUpdate = true;
	}
	
	this.set_opacity = function(model_id, opacity)
	{
		if (_this.models_ref[model_id]===undefined) return _this.model_error("set_display - id not found: "+model_id);
	
		var model=_this.models[_this.models_ref[model_id]];
		if (!model) return;
		
		this.set_material_opacity(model.mesh.material, opacity);
	}

	this.set_material_opacity=function(material, opacity)
	{
		if (!material) return;
		if (opacity<1)
		{
			material.opacity=opacity;
			material.transparent = true;
		}
		else
		{
			material.opacity=1;
			material.transparent = false;
		}
	}

	this.onmousedown=function (event)
	{
		event.stopPropagation();
		event.preventDefault();
		
		switch (event.type)
		{
			case 'touchstart':
				var touch = event.touches[0] || event.changedTouches[0];
				_this.mouse.x = ( (touch.pageX-_this.parent_element.offsetLeft) / _this.parent_element.clientWidth ) * 2 - 1;
				_this.mouse.y = - ( (touch.pageY-_this.parent_element.offsetTop) / _this.parent_element.clientHeight ) * 2 + 1;
				break;
				
			default: //click
				_this.mouse.x = ( (event.clientX-_this.parent_element.offsetLeft) / _this.parent_element.clientWidth ) * 2 - 1;
				_this.mouse.y = - ( (event.clientY-_this.parent_element.offsetTop) / _this.parent_element.clientHeight ) * 2 + 1;
		}
		
		_this.raycaster.setFromCamera( _this.mouse, _this.camera );
		var intersects = _this.raycaster.intersectObjects( _this.scene.children );
		
		if (intersects.length>0)
		{
			if (intersects[0].object.model_id===undefined) return;
			if (_this.onmousedown_callback)
			{
				_this.onmousedown_callback(intersects[0].object.model_id, event, intersects[0].distance);
			}
		}
		else if (_this.send_no_model_click_event)
			_this.onmousedown_callback(null, event, 0);
	}

	//will return if value is empty (null/undefined etc.) and not zero (which is valid)
	this.is_empty=function(a)
	{
		return (!a && a !== 0);
	}

	this.set_position = function(model_id, x,y,z)
	{
		if (_this.models_ref[model_id]===undefined) return _this.model_error("set_position - id not found: "+model_id);
	
		var model=_this.models[_this.models_ref[model_id]];
		if (!model) return;
		if (!model.mesh) return;
		
		model.x=(!_this.is_empty(x)?x:(model.x));
		model.y=(!_this.is_empty(y)?y:(model.y));
		model.z=(!_this.is_empty(z)?z:(model.z));
		
		model.mesh.position.set(model.x, model.y, model.z);
		
		//console.log("x/y/z: "+model.x+"/"+model.y+"/"+model.z+"/");
		
		//if model has edges - we need to update it
		if (model.edges)
			_this.set_or_update_geo_edges (model, true, true);		
	}

	this.set_material_display = function(display, material, geo)
	{
		switch (display.toLowerCase())
		{
			case "wireframe":
				material.wireframe=true;
				break;
			
			case "smooth":
				material.wireframe=false;
				material.shading=THREE.SmoothShading;
				if (geo)
				{
					geo.mergeVertices();
					geo.computeVertexNormals();
				}
				break;
				
			case "flat":
				material.wireframe=false;
				material.shading=THREE.FlatShading;
				if (geo)
					geo.computeFlatVertexNormals();
				break;
		}
	}

	//rotate the mesh around itself (which is relative to world, not for mesh)
	//axis_x_angel, axis_y_angel, axis_z_angel - radians - set rotation
	this.set_rotation = function (model_id, axis_x_angel, axis_y_angel, axis_z_angel, add_to_current)
	{
		if (_this.models_ref[model_id]===undefined) return _this.model_error("rotate - id not found: "+model_id);
	
		var model=_this.models[_this.models_ref[model_id]];
		if (!model) return;	

		var c=add_to_current?1:0; //add or set angle

		if (axis_x_angel)
		{
			model.rotationx=axis_x_angel+model.mesh.rotation.x*c;
			model.mesh.rotation.x=model.rotationx;
		}
			
		if (axis_y_angel)
		{
			model.rotationy=axis_y_angel+model.mesh.rotation.y*c;
			model.mesh.rotation.y=model.rotationy;
		}
			
		if (axis_z_angel)
		{
			model.rotationz=axis_y_angel+model.mesh.rotation.y*c;
			model.mesh.rotation.z=model.rotationz;
		}

		model.mesh.updateMatrixWorld();

		//if model has edges - we need to update it
		if (model.edges)
			_this.set_or_update_geo_edges (model, true);
	}

	//rotate the mesh around itself (which is relative to world, not for mesh)
	//axis_x_angel, axis_y_angel, axis_z_angel - radians - add to current rotation
	this.rotate = function (model_id, axis_x_angel, axis_y_angel, axis_z_angel)
	{
		_this.set_rotation(model_id, axis_x_angel, axis_y_angel, axis_z_angel,true);
	}

	this.get_model_filename=function(model, no_null)
	{
		if (model.orig_filename) return model.orig_filename;
		if (model.temp_filename) return model.temp_filename;
		if (model.orig_url) return model.orig_url;
		if (model.local_file) if (model.local_file.name) return model.local_file.name;
		
		if (model.filename)
		{
			if (model.filename instanceof File) return File.name
			return model.filename;
		}
		
		if (no_null) return 'model_'+model.id+'.stl'; //relevant for manually added meshes
		
		return null;
	}

	this.add_model = function(new_model, dont_add_to_model_count)
	{
		if (Array.isArray(new_model)) return _this.add_models(new_model);
		
		if (!_this.ready)
		{
			//THREE files not ready - queuing
			_this.models_to_add.push(new_model);
			return _this.model_error("THREE JS files are not ready");
		}

		var model_filename=_this.get_model_filename(new_model);
		if (model_filename)
		{
			switch (model_filename.split('.').pop())
			{
				case 'vsj':
					return _this.load_vsj(new_model.local_file?new_model.local_file:model_filename);

				case 'vsb':
					return _this.load_vsb(new_model.local_file?new_model.local_file:model_filename);
							
				//default: assumed as a regular model (STL etc.) - do nothing, continue below
			}
		}
		
		if (typeof(new_model.id) == 'undefined') new_model.id=-1;
		var model_error=_this.error_in_model(new_model);
		if (model_error)
			return model_error;

		if (new_model.id==-1)
			new_model.id=(++_this.max_model_id);
			
		_this.models.push(new_model);
		var key=_this.models.indexOf(new_model);

		if (!dont_add_to_model_count)
			if (_this.models_ref[new_model.id]===undefined) _this.models_count++;
			
		_this.models_ref[new_model.id]=key;
		
		//console.log("id:",new_model.id, "count",_this.models_count, "ref:",_this.models_ref[new_model.id], dont_add_to_model_count);
		
		//console.log('added', new_model.id, _this.models_count, _this.models_ref[new_model.id]);
		_this.load_model(new_model);
		return _this.status;
	}

	//add models, input is array of models
	this.add_models=function (new_models)
	{
		if (!Array.isArray(new_models)) return _this.add_model(new_models);
		_this.status=0;
		var model_keys=Object.keys(new_models);
		//_this.models_count+=model_keys.length;
		
		//count models to load
		model_keys.forEach(function(key)
		{
			var model_filename=_this.get_model_filename(new_models[model_keys[key]]);
			
			if (model_filename)
			{
				switch (model_filename.split('.').pop())
				{
					case 'vsj':
					case 'vsb':
						//do nothing
						break;
					
					default:
						if (_this.models_ref[new_models[key].id]===undefined) _this.models_count++;
				}
			}
			else
				if (_this.models_ref[new_models[key].id]===undefined) _this.models_count++;
		});

		//add model by model
		model_keys.forEach(function(key)
		{
			_this.add_model(new_models[key], true);
		});
		
		return _this.status;
	}

	this.calc_volume_and_area=function(geo)
	{
		var x1,x2,x3,y1,y2,y3,z1,z2,z3,i;
		var len=geo.faces.length;
		var totalVolume=0;
		var totalArea=0;
		var a,b,c,s;
				
		for (i=0;i<len;i++)
		{
			x1=geo.vertices[geo.faces[i].a].x;
			y1=geo.vertices[geo.faces[i].a].y;
			z1=geo.vertices[geo.faces[i].a].z;
			x2=geo.vertices[geo.faces[i].b].x;
			y2=geo.vertices[geo.faces[i].b].y;
			z2=geo.vertices[geo.faces[i].b].z;
			x3=geo.vertices[geo.faces[i].c].x;
			y3=geo.vertices[geo.faces[i].c].y;
			z3=geo.vertices[geo.faces[i].c].z;
					
			totalVolume += 
				(-x3 * y2 * z1 + 
				x2 * y3 * z1 +
				x3 * y1 * z2 - 
				x1 * y3 * z2 - 
				x2 * y1 * z3 + 
				x1 * y2 * z3);
						
			a=geo.vertices[geo.faces[i].a].distanceTo(geo.vertices[geo.faces[i].b]);
			b=geo.vertices[geo.faces[i].b].distanceTo(geo.vertices[geo.faces[i].c]);
			c=geo.vertices[geo.faces[i].c].distanceTo(geo.vertices[geo.faces[i].a]);
			s=(a+b+c)/2;
			totalArea+=Math.sqrt(s*(s-a)*(s-b)*(s-c));
		}

		return [Math.abs(totalVolume/6), totalArea, geo.faces.length];
	}

	this.get_model_info = function(model_id)
	{
		if (_this.models_ref[model_id]===undefined) return _this.model_error("get_model_info - id not found: "+model_id);
	
		var model=_this.models[_this.models_ref[model_id]];
		
		if (!model) return null;
		if (!model.mesh) return null;
		if (!model.mesh.geometry) return null;
		
		var vol_and_area=model.mesh.geometry?_this.calc_volume_and_area(model.mesh.geometry):[0,0,0];
		return {name:model.filename?model.filename:(model.local_file?model.local_file.name:""), orig_filename:model.orig_filename?model.orig_filename:null, position:{x:model.x, y:model.y, z:model.z}, dims:{x:model.mesh.geometry.maxx-model.mesh.geometry.minx, y:model.mesh.geometry.maxy-model.mesh.geometry.miny, z:model.mesh.geometry.maxz-model.mesh.geometry.minz}, rotation:{x:model.mesh.rotation.x,y:model.mesh.rotation.y,z:model.mesh.rotation.z}, display:model.display?model.display:null, color:model.color?model.color:null, scale:{x:model.scalex,y:model.scaley,z:model.scalez}, volume:vol_and_area[0], area:vol_and_area[1], triangles:vol_and_area[2]};
	}

	this.get_vsb = function()
	{
		var files_arr=[]; //array of model binary data (as arraybuffer)
	
		Object.keys(_this.models_ref).forEach(function(key)
		{
			files_arr.push({id:key, bin:_this.get_stl_bin(key)});
		});
		
		//console.log(files_arr);
		//console.log(_this.get_vsj(true));
	
		return {vsj:_this.get_vsj(true,true,true), files:files_arr};
	}

	this.get_vsj = function(as_js_obj, force_basename, for_vsb)
	{
		//get object info in json format
		var pos=_this.camera.position;
		var data={canvas_height:_this.canvas_height, bg_color:_this.bg_color, camera_state:_this.get_camera_state(), auto_rotate:_this.auto_rotate, mouse_zoom:_this.mouse_zoom, auto_resize:_this.auto_resize, center_models:_this.center_models};
		data['models']=[];
		
		Object.keys(_this.models_ref).forEach(function(key)
		{
			var model=_this.models[_this.models_ref[key]];
			var info={id:model.id};
			
			if (for_vsb)
			{
				var curr_filename=_this.get_model_filename(model, true);
				if (curr_filename) info['filename']=force_basename?_this.basename(curr_filename):curr_filename;
			}
			else
			{
				if (model.filename) info['filename']=force_basename?_this.basename(model.filename):model.filename;
				if (model.local_file) info['local_file']=model.local_file;
			}
			if (model.x) info['x']=model.x;
			if (model.y) info['y']=model.y;
			if (model.z) info['z']=model.z;
			if (model.display) info['display']=model.display;
			if (model.color) info['color']=model.color;
			if (model.rotationx) info['rotationx']=model.rotationx;
			if (model.rotationy) info['rotationy']=model.rotationy;
			if (model.rotationz) info['rotationz']=model.rotationz;
			if ((model.scale!==undefined)&&(!for_vsb)) if (model.scale!=1) info['scale']=model.scale;
			if ((model.scalex!=1)&&(!for_vsb)) info['scalex']=model.scalex; //in vsb the scale will always be 1, in order to skip scaling when the vsb will be loaded (to avoid double scaling as the geometry is already scalled)
			if ((model.scaley!=1)&&(!for_vsb)) info['scaley']=model.scaley;
			if ((model.scalez!=1)&&(!for_vsb)) info['scalez']=model.scalez;
			if (model.opacity!==undefined) if (model.opacity!=1) info['opacity']=model.opacity;
			if (model.view_edges) info['view_edges']=model.view_edges;
			if (model.animation)
			{
				info['animation']=JSON.parse(JSON.stringify(model.animation)); //clone
				delete info['animation'].start_time;
				delete info['animation'].last_time;
			}
			
			//data['models'].push(info);
			data['models'][_this.models_ref[key]]=info;
			
			
		});

		return as_js_obj?data:_this.json_without_nulls(data);
	}

	this.download_vsj = function(filename)
	{
		var blob = new Blob([_this.get_vsj()], {type: "application/json"});
		var link = document.createElement("a");
		link.href = window.URL.createObjectURL(blob);
		var download_name=filename?filename:"1";
		var p=download_name.toLowerCase().indexOf('.vsj');
		if (p>=0) download_name=download_name.substring( 0, p );
		if (download_name.length<1) download_name='1';
		
		link.download = download_name+'.vsj';
		link.click();
	}

	this.load_vsj = function(filename)
	{
		if (!filename)
		{
			//not filename, check if VSJ is in memory
			if (_this.pre_loaded_vsj)
			{
				stl_viewer.init_by_json(_this.pre_loaded_vsj);
				_this.pre_loaded_vsj=null;
				return true;
			}
			
			return _this.model_error("load_vsj - invalid filename"+filename, _this.load_error_callback);
		}
	
		if (filename instanceof File)
		{
			//a local file - as text, then pass it to init_by_json
			return _this.read_bin_file(filename, _this.init_by_json, null, true);
		}
	
		//a url - load scene from vsj file
		var xhr = new XMLHttpRequest();

		xhr.onreadystatechange =
		function(e)
		{
			if (xhr.readyState == 4)
			{
				if (xhr.status==200)
				{
					_this.init_by_json(xhr.response.trim());
				}
			}
		}
		
		xhr.open("GET", filename, true);
		xhr.send(null);
	}


	this.padend=function(s,targetLength,padString)
	{
		targetLength = targetLength>>0; //floor if number or convert non-number to 0;
		padString = String((typeof padString !== 'undefined' ? padString : ' '));
		if (s.length > targetLength)
		{
			return String(s);
		}
		else
		{
			targetLength = targetLength-s.length;
			if (targetLength > padString.length)
			{
				padString += padString.repeat(targetLength/padString.length); //append to original to ensure we are longer than needed
			}
			return String(s) + padString.slice(0,targetLength);
		}
	}

	this.get_normal = function (v1, v2, v3)
	{
		var u= {x:v2.x-v1.x, y:v2.y-v1.y, z:v2.z-v1.z};
		var v= {x:v3.x-v1.x, y:v3.y-v1.y, z:v3.z-v1.z};
		
		var n={x:0,y:0,z:0};
		n.x=u.y*v.z - u.z*v.y;
		n.y=u.z*v.x - u.x*v.z;
		n.z=u.x*v.y - u.y*v.x;
		
		//normalize
		var div_val=Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
		if (div_val!=0)
		{
			n.x /= div_val;
			n.y /= div_val;
			n.z /= div_val;
		}		
		
		return(n);
	}

	this.get_stl_bin = function(model_id)
	{
		if (_this.models_ref[model_id]===undefined) return _this.model_error("get_stl_bin - id not found: "+model_id);
		
		var model=_this.models[_this.models_ref[model_id]];
		if (!model) return;
		if (!model.mesh) return;
		
		var geo=model.mesh.geometry;
		if (!geo) return;
		
		var a=new ArrayBuffer(80+4+geo.faces.length*50);
		var d = new DataView(a);
		
		var enc = new TextEncoder();
		
		var s=_this.padend(('Binary'+(model.colors?' colored':'')+' STL by viewstl.com'), 80, ' ');
		for (var i=0; i < 80; i++)
		{
			d.setUint8(i, s.charCodeAt(i), true);
		}
		
		d.setUint32(80, geo.faces.length, true);
		
		var pos=84;
		Object.keys(geo.faces).forEach(function(face_key)
		{
			var fdata=geo.faces[face_key];
			var v1=geo.vertices[fdata.a];
			var v2=geo.vertices[fdata.b];
			var v3=geo.vertices[fdata.c];
			var color=1;
			var n=_this.get_normal(v1,v2,v3);
			
			//console.log(v1.x, v1.x.toString(2));
			
			//normal
			d.setFloat32(pos, n.x, true);pos+=4;
			d.setFloat32(pos, n.y, true);pos+=4;
			d.setFloat32(pos, n.z, true);pos+=4;
				
			//vertex1
			d.setFloat32(pos, v1.x, true);pos+=4;
			d.setFloat32(pos, v1.y, true);pos+=4;
			d.setFloat32(pos, v1.z, true);pos+=4;
				
			//vertex2
			d.setFloat32(pos, v2.x, true);pos+=4;
			d.setFloat32(pos, v2.y, true);pos+=4;
			d.setFloat32(pos, v2.z, true);pos+=4;
				
			//vertex3
			d.setFloat32(pos, v3.x, true);pos+=4;
			d.setFloat32(pos, v3.y, true);pos+=4;
			d.setFloat32(pos, v3.z, true);pos+=4;
			
			//color (?)
			if (model.colors)
				d.setUint16(pos, Math.ceil(fdata.color.r*31) | (Math.ceil(fdata.color.g*31)<<5) | (Math.ceil(fdata.color.b*31)<<10), true);
			else
				d.setUint16(pos, 0, true);
				
			pos+=2;

		});
		
		return a;
	}

	this.basename=function(str)
	{
		return str.substr(str.lastIndexOf('/') + 1); 
	}

	this.json_without_nulls=function(arr)
	{
		return JSON.stringify(arr).split(",null").join("");
	}

	this.download_vsb = function(filename)
	{
		var zip=null;
		try
		{
			zip = new JSZip();
		}
		catch(err)
		{
			console.log('download_vsb - JSZip is missing ', err.message);
			return false;
		}
	
		var vsb=_this.get_vsb();
	
		zip.file("json_data.vsj", _this.json_without_nulls(vsb.vsj));
		Object.keys(vsb.files).forEach(function(key)
		{
			//console.log("KEY: ",key,vsb.files[key],_this.models_ref,_this.models_ref[vsb.files[key].id],vsb.vsj.models);
			var curr_filename=_this.get_model_filename(vsb.vsj.models[_this.models_ref[vsb.files[key].id]], true);
			zip.file(_this.basename(curr_filename), vsb.files[key].bin);
		});
		
		zip.generateAsync({type:"blob"})
			.then(function(content)
			{
				var blob = new Blob([content], {type: "application/zip"});
				var link = document.createElement("a");
				link.href = window.URL.createObjectURL(blob);
				var download_name=filename?filename:"1";
				var p=download_name.toLowerCase().indexOf('.vsb');
				if (p>=0) download_name=download_name.substring( 0, p );
				if (download_name.length<1) download_name='1';
				
				link.download = download_name+'.vsb';
				link.click();
			});
		
		return;
	}

	this.load_vsb = function(filename)
	{
		_this.pre_loaded_ab_files=[];
		_this.pre_loaded_vsj=null;
	
		if (filename instanceof File)
		{
			//return _this.read_bin_file(filename, _this.load_vsb_from_blob, _this.loading_progress_callback);
			return _this.read_bin_file(filename, _this.load_vsb_from_blob);  //read file - as arraybuffer, then pass it to load_vsb_from_blob
		}
	
		JSZipUtils.getBinaryContent(decodeURIComponent(filename), function(err, data)
		{
			if(err)
			{
				return _this.model_error("load_vsb "+err, _this.load_error_callback);
			}
			
			_this.load_vsb_from_blob(data);
		});
	}
	
	this.read_bin_file=function(f, after_read_func, prog_func, as_text)
	{
		var reader = new FileReader();
					
		reader.onerror = function(e)
		{
			console.log("reading file error", e);
			return null;
		}
						
		reader.onload = function(e)
		{
			return after_read_func(e.target.result);
		};
		
		if (prog_func)
		{
			reader.onprogress = function(e)
			{
				prog_func({loaded:e.loaded, total:e.total, load_session:-1}, -1);
			};
		}
		
		if (as_text)
			reader.readAsText(f);
		else
			reader.readAsArrayBuffer(f);
	}
	
	this.load_vsb_from_blob = function(blob)
	{
		var zip=null;
		try
		{
			zip = new JSZip();
		}
		catch(err)
		{
			console.log('load vsb - JSZip is missing ', err.message);
			return false;
		}
	
		zip.loadAsync(blob).then(function ()
		{
			_this.zip_load_count=Object.keys(zip.files).length;
			zip.forEach(function (relativePath, zipEntry)
			{
				if (zipEntry.name=="json_data.vsj")
				{
					zip.files[zipEntry.name].async('string').then(function (fileData)
					{
						_this.pre_loaded_vsj=fileData;
						_this.zip_load_count--;if (_this.zip_load_count==0) _this.load_vsj(null);
					});
				}
				else
				{
					zip.files[zipEntry.name].async('blob').then(function (fileData)
					{
						_this.pre_loaded_ab_files[zipEntry.name]=fileData;
						_this.zip_load_count--;if (_this.zip_load_count==0) _this.load_vsj(null);
					});
				}
            });
		});
	}

	//load arraybuffer to memory (for later loading)
	this.load_bin_to_ab_file=function(url, ab_data)
	{
		if (!_this.pre_loaded_ab_files) _this.pre_loaded_ab_files=[];
		_this.pre_loaded_ab_files[url]=ab_data;
		_this.add_model({id:-1, filename:url});
	}

	this.download_model = function(model_id, filename)
	{
		if (_this.models_ref[model_id]===undefined) return _this.model_error("download_model - id not found: "+model_id);
		
		var model=_this.models[_this.models_ref[model_id]];
		if (!model) return;
		if (!model.mesh) return;
		
		var blob = new Blob([_this.get_stl_bin(model_id)], {type: "application/sla"});
		var link = document.createElement("a");
		link.href = window.URL.createObjectURL(blob);
		var download_name=filename?filename:(model.filename?model.filename:(model.local_file?model.local_file.name:"1"));
		var p=download_name.toLowerCase().indexOf('.stl');
		if (p>=0) download_name=download_name.substring( 0, p );
		if (download_name.length<1) download_name='1';
		
		link.download = download_name+'.stl';
		link.click();
	}

	this.get_model_mesh = function(model_id)
	{
		if (_this.models_ref[model_id]===undefined) return _this.model_error("get_model_mesh - id not found: "+model_id);
	
		var model=_this.models[_this.models_ref[model_id]];
		if (!model) return;
		if (!model.mesh) return;
		
		return model.mesh.clone();
	}


	this.set_auto_rotate = function(b)
	{
		_this.controls.autoRotate=b;
	}

	this.set_mouse_zoom = function(b)
	{
		_this.controls.noZoom=!b;
	}

	//THREE.JS stuff
	//world vectors
	this.WORLD_X_VECTOR=null;
	this.WORLD_Y_VECTOR=null;
	this.WORLD_Z_VECTOR=null;
	
	this.maxx=null;
	this.maxy=null;
	this.maxz=null;
	this.minx=null;
	this.miny=null;
	this.minz=null;
	this.edges_material=null;
	this.raycaster=null; //used for onmousedown events
	this.mouse =null; //used for onmousedown events
	this.scene = null;
	this.is_webgl=null;
	this.renderer = null;
	this.camera = null;
	this.ambientLight = null;
	this.directionalLight = null;
	this.pointLight = null;
	this.controls = null;

	this.do_resize = function()
	{
		var r=_this.parent_element.getBoundingClientRect();
		var rsize_width=r.width;
		var rsize_height=r.height;
					
		_this.camera.aspect = rsize_width / rsize_height;
		_this.camera.updateProjectionMatrix();
		_this.renderer.setSize(rsize_width-5, rsize_height-5);
	}

	this.animation=new Array();	
	this.animate = function()
	{
		Object.keys(_this.animation).forEach(function(key)
		{
			if (!(_this.models_ref[key]===undefined))
				_this.do_model_animation(_this.models[_this.models_ref[key]]);
		});
	
 		requestAnimationFrame(_this.animate);
 		_this.renderer.render(_this.scene, _this.camera);
 		
 		//console.log(_this.camera.position);
 		
 		if (_this.controls)
			_this.controls.update();
	}	

	//called by animate
	this.do_model_animation=function(model)
	{
		//console.log('animation '+model+animation);
		if (!model.animation) return;
		
		var curr_time=Date.now();
		if (!model.animation.start_time) model.animation.start_time=curr_time;
		
		if (model.animation.delta)
		{
			var p=(curr_time-model.animation.start_time)/model.animation.delta.msec; //percentage
			var p_from_last_time=model.animation.last_time?((curr_time-model.animation.last_time)/model.animation.delta.msec):p;
			_this.animation_next_delta(model,model.animation.delta,p_from_last_time);
			
			if (p>=1)
			{
				if (!model.animation.delta.loop)
				{
					_this.remove_model_animation(model, true);
					return;
				}
				else
					//loop - start over
					model.animation.delta.start_time=null;
			}
		}
		
		if (model.animation.exact)
		{
			var p_from_last_time=(curr_time-(model.animation.last_time?(model.animation.last_time):(model.animation.start_time)))/model.animation.exact.msec;
			_this.animation_next_exact(model,model.animation.exact,p_from_last_time);
			
			if (curr_time>=model.animation.start_time+model.animation.exact.msec)
			{
				_this.remove_model_animation(model,false,true);
				return;
			}
		}

		
		model.animation.last_time=curr_time;
	}

	//increments values during animation
	this.animation_next_delta=function(model,a_data,inc_const)
	{
		var done_position=false;
		var done_rotation=false;
		var done_scale=false;
		Object.keys(a_data).forEach(function(key)
		{
			switch(key)
			{
				case 'x':
				case 'y':
				case 'z':
					if (!done_position) //we'll do all x/y/z at once (and one time ...)
					{
						done_position=true;
						_this.set_position(model.id,
							model.x+((a_data.x!==undefined)?(a_data.x*inc_const):0),
							model.y+((a_data.y!==undefined)?(a_data.y*inc_const):0),
							model.z+((a_data.z!==undefined)?(a_data.z*inc_const):0)
						);
					}
					break;
					
				case 'rotationx':
				case 'rotationy':
				case 'rotationz':
					if (!done_rotation) //we'll do all x/y/z at once (and one time ...)
					{
						done_rotation=true;
						_this.rotate(model.id,
							((a_data.rotationx!==undefined)?(a_data.rotationx*inc_const):0),
							((a_data.rotationy!==undefined)?(a_data.rotationy*inc_const):0),
							((a_data.rotationz!==undefined)?(a_data.rotationz*inc_const):0)
						);
					}
					break;
				
				case 'scale':
				case 'scalex':
				case 'scaley':
				case 'scalez':
					if (!done_scale) //we'll do all x/y/z at once (and one time ...)
					{
						done_scale=true;
						a_data.scalex=a_data.scalex?a_data.scalex:(a_data.scale?a_data.scale:null);
						a_data.scaley=a_data.scaley?a_data.scaley:(a_data.scale?a_data.scale:null);
						a_data.scalez=a_data.scalez?a_data.scalez:(a_data.scale?a_data.scale:null);
						_this.set_scale(model.id,
							model.scalex+((a_data.scalex!==undefined)?(a_data.scalex*inc_const):0),
							model.scaley+((a_data.scaley!==undefined)?(a_data.scaley*inc_const):0),
							model.scalez+((a_data.scalez!==undefined)?(a_data.scalez*inc_const):0)
						);
					}
					break;
						
			}
		});		
	}
	
	this.animation_next_exact=function(model,a_data,p_from_last_time)
	{
		var done_position=false;
		var done_rotation=false;
		var done_scale=false;
		Object.keys(a_data).forEach(function(key)
		{
			switch(key)
			{
				case 'x':
				case 'y':
				case 'z':
					if (!done_position) //we'll do all x/y/z at once (and one time ...)
					{
						done_position=true;
						if (a_data.xtotal===undefined) a_data.xtotal=a_data.x-model.x;
						if (a_data.ytotal===undefined) a_data.ytotal=a_data.y-model.y;
						if (a_data.ztotal===undefined) a_data.ztotal=a_data.z-model.z;
						_this.set_position(model.id,
							model.x+((a_data.x!==undefined)?(a_data.xtotal*p_from_last_time):0),
							model.y+((a_data.y!==undefined)?(a_data.ytotal*p_from_last_time):0),
							model.z+((a_data.z!==undefined)?(a_data.ztotal*p_from_last_time):0)
						);
					}
					break;
					
				case 'rotationx':
				case 'rotationy':
				case 'rotationz':
					if (!done_rotation) //we'll do all x/y/z at once (and one time ...)
					{
						done_rotation=true;
						var rot=model.mesh.getWorldRotation();
						if (a_data.rotxtotal===undefined) a_data.rotxtotal=a_data.rotationx-rot.x;
						if (a_data.rotytotal===undefined) a_data.rotytotal=a_data.rotationy-rot.y;
						if (a_data.rotztotal===undefined) a_data.rotztotal=a_data.rotationz-rot.z;
						_this.rotate(model.id,
							((a_data.rotationx!==undefined)?(a_data.rotxtotal*p_from_last_time):0),
							((a_data.rotationy!==undefined)?(a_data.rotytotal*p_from_last_time):0),
							((a_data.rotationz!==undefined)?(a_data.rotztotal*p_from_last_time):0)
						);
					}
					break;
					
				case 'scale':
				case 'scalex':
				case 'scaley':
				case 'scalez':
					if (!done_scale) //we'll do all x/y/z at once (and one time ...)
					{
						done_scale=true;
						a_data.scalex=a_data.scalex?a_data.scalex:(a_data.scale?a_data.scale:null);
						a_data.scaley=a_data.scaley?a_data.scaley:(a_data.scale?a_data.scale:null);
						a_data.scalez=a_data.scalez?a_data.scalez:(a_data.scale?a_data.scale:null);					
						if (a_data.scalextotal===undefined) a_data.scalextotal=a_data.scalex-model.scalex;
						if (a_data.scaleytotal===undefined) a_data.scaleytotal=a_data.scaley-model.scaley;
						if (a_data.scaleztotal===undefined) a_data.scaleztotal=a_data.scalez-model.scalez;
						_this.set_scale(model.id,
							model.scalex+((a_data.scalex!==undefined)?(a_data.scalextotal*p_from_last_time):0),
							model.scaley+((a_data.scaley!==undefined)?(a_data.scaleytotal*p_from_last_time):0),
							model.scalez+((a_data.scalez!==undefined)?(a_data.scaleztotal*p_from_last_time):0)
						);
					}
					break;
						
			}
		});		
	}	

	this.remove_model_animation=function(model, remove_delta, remove_exact)
	{
		if (remove_delta)
			//remove delta part only
			model.animation.delta=null;
			
		if (remove_exact)
			//remove exact part only
			model.animation.exact=null;
		
		if ((model.animation.delta)||(model.animation.exact)) return;
	
		model.animation=null;
		//_this.animation[model.id]=0;
		delete _this.animation[model.id];
	}

	this.animate_model = function(model_id, animation)
	{
		if (_this.models_ref[model_id]===undefined) return _this.model_error("animate-model - id not found: "+model_id);
	
		var model=_this.models[_this.models_ref[model_id]];
		if (!model) return;
	
		if (!animation) return _this.remove_model_animation(model,true,true);
	
		model.animation=JSON.parse(JSON.stringify(animation)); //cloning the animation object
		
		if (model.animation.delta) if (!model.animation.delta.msec) model.animation.delta.msec=300;
		if (model.animation.exact) if (!model.animation.exact.msec) model.animation.exact.msec=300;
		_this.animation[model_id]=1;
	}
	
	//init (mainly three js stuff)
	this.init_done=false;
	this.init=function()
	{
		//console.log('init '+_this.parent_element.id, _this.models_to_add);
		if (!_this.init_done) //one time only
		{
			_this.WORLD_X_VECTOR=new THREE.Vector3(1, 0, 0);
			_this.WORLD_Y_VECTOR=new THREE.Vector3(0, 1, 0);
			_this.WORLD_Z_VECTOR=new THREE.Vector3(0, 0, 1);
		
			_this.edges_material=new THREE.LineBasicMaterial( { color: 0x000000 } );
			_this.raycaster = new THREE.Raycaster(); //used for onmousedown events
			_this.mouse = new THREE.Vector2(); //used for onmousedown events
			
			//this.material=new THREE.MeshLambertMaterial({color:0x909090, overdraw: 1, wireframe: false, shading:THREE.FlatShading, vertexColors: THREE.FaceColors});
			_this.scene = new THREE.Scene();
			_this.is_webgl=webgl_Detector.webgl;
			_this.renderer = _this.is_webgl ? new THREE.WebGLRenderer({preserveDrawingBuffer:true, alpha:true}): new THREE.CanvasRenderer({alpha:true});
			_this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);
			_this.parent_element.appendChild(_this.renderer.domElement);
			_this.scene.add(_this.camera);
			
			_this.ambientLight = new THREE.AmbientLight(0x202020);
			_this.camera.add(_this.ambientLight);
					
			_this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.75);
			_this.directionalLight.position.x = 1;
			_this.directionalLight.position.y = 1;
			_this.directionalLight.position.z = 2;
			_this.directionalLight.position.normalize();
			_this.camera.add(_this.directionalLight);
		    
			_this.pointLight = new THREE.PointLight(0xffffff, 0.3);
			_this.pointLight.position.x = 0;
			_this.pointLight.position.y = -25;
			_this.pointLight.position.z = 10;
			_this.camera.add(_this.pointLight);
			
			switch (_this.controls_type)
			{
				case 1: //TrackballControls
					_this.controls = new THREE.TrackballControls(_this.camera, _this.renderer.domElement);
					break;
						
				default: //OrbitControls
					_this.controls = new THREE.OrbitControls(_this.camera, _this.renderer.domElement);
					_this.controls.autoRotate=_this.auto_rotate;
					break;
			}
			
			_this.set_on_model_mousedown(_this.onmousedown_callback);
		}
		
		_this.set_bg_color(_this.bg_color);
		
		if (_this.mouse_zoom===false)
			_this.set_mouse_zoom(_this.mouse_zoom);
		
		if (_this.camera_state)
			_this.set_camera_state(_this.camera_state);
		else
			_this.camera.position.set(_this.camerax,_this.cameray,_this.cameraz);
		
		_this.do_resize();

		
		//start action
		if (_this.models_to_add)
		{
			_this.add_models(_this.models_to_add);
		}
		
		_this.set_auto_resize(_this.auto_resize);

		_this.animate();
		
		_this.init_done=true;
	}
	
	this.set_auto_resize=function(b)
	{
		if (!_this.do_resize) return;
		
		window.removeEventListener('resize', _this.do_resize);
	
		if (b)
			window.addEventListener('resize', _this.do_resize);
			
	}
	
	this.vf_to_geo = function (vertices, faces, colors)
	{
		if (!vertices) return null;
		if (!faces) return null;
		
		var geo_vertices=[];
		var geo_faces=[];
	
		var len=vertices.length;
		for (i=0;i<len;i++)
			geo_vertices.push(new THREE.Vector3(vertices[i][0],vertices[i][1],vertices[i][2]));

		var len=faces.length;
		
		if (!colors)
		{
			for (i=0;i<len;i++)
				geo_faces.push(new THREE.Face3(faces[i][0],faces[i][1],faces[i][2]));
		}
		else
		{
			for (i=0;i<len;i++)
			{
				var face=new THREE.Face3(faces[i][0],faces[i][1],faces[i][2]);
				face.color.setRGB ( faces[i][3], faces[i][4], faces[i][5] );
				geo_faces.push(face);
			}
		}
		
		
		var geo=new THREE.Geometry;
		geo.vertices=geo_vertices;
		geo.faces=geo_faces;				
		geo.computeBoundingBox();
		geo.computeFaceNormals();
		geo.computeVertexNormals();
		
		if (_this.center_models)
			geo.center(geo);
			
		//_this.set_geo_minmax(geo);
		
		return (geo);
	}
	
	//calc min/max positions for a geometry - useful
	this.set_geo_minmax = function (model)
	{
		var geo=model.mesh.geometry;
		if (geo.boundingBox)
		{
			geo.minx=geo.boundingBox.min.x;
			geo.miny=geo.boundingBox.min.y;
			geo.minz=geo.boundingBox.min.z;
			geo.maxx=geo.boundingBox.max.x;
			geo.maxy=geo.boundingBox.max.y;
			geo.maxz=geo.boundingBox.max.z;	
		}
		else
		{
			var vertices=geo.vertices;
			var minx=vertices[0].x;
			var miny=vertices[0].y;
			var minz=vertices[0].z;
			var maxx=vertices[0].x;
			var maxy=vertices[0].y;
			var maxz=vertices[0].z;			
			
			var i=vertices.length;
			while (i--)
			{
				if (vertices[i].x<minx) minx=vertices[i].x;
				if (vertices[i].y<miny) miny=vertices[i].y;
				if (vertices[i].z<minz) minz=vertices[i].z;
				if (vertices[i].x>maxx) maxx=vertices[i].x;
				if (vertices[i].y>maxy) maxy=vertices[i].y;
				if (vertices[i].z>maxz) maxz=vertices[i].z;
			}
			geo.minx=minx+model.x;
			geo.miny=miny+model.y;
			geo.minz=minz+model.z;
			geo.maxx=maxx+model.x;
			geo.maxy=maxy+model.y;
			geo.maxz=maxz+model.z;	
		}
	}
	
	//drag and drop
	this.handleDragOver = function(e)
	{
		e.stopPropagation();
		e.preventDefault();
		e.dataTransfer.dropEffect = 'copy';		
	}
	
	this.handleFileDrop = function(e)
	{
		e.stopPropagation();
		e.preventDefault();
		
		//first, check if its a file
		if (e.dataTransfer.files.length>0)
		{
			_this.load_local_files(e.dataTransfer.files);
		}
				
		else if (typeof e.dataTransfer.getData("Text") === 'string')
		{
			//check - maybe a url?
			_this.add_model({id:-1, filename:e.dataTransfer.getData("Text")});
			if (_this.on_model_drop) _this.on_model_drop(e.dataTransfer.getData("Text"));
		}
	}
	
	this.load_local_files = function(files)
	{
		//first, check if its a file
		if (files.length>0)
		{
			var dropped_models=new Array();
			var len=files.length;
			for (var i=0;i<len;i++)
			{
				switch (files[i].name.split('.').pop())
				{
					case 'vsj':
						_this.load_vsj(files[i]);
						break;

					case 'vsb':
						_this.load_vsb(files[i]);
						break;
						
					default:
						//assumed as a regular model (STL etc.)
						dropped_models.push({id:-1, local_file:files[i]});
				}
			
				if (_this.on_model_drop) _this.on_model_drop(files[i].name);
			}
			_this.add_models(dropped_models);
			
		}
	}
	
	this.clean = function()
	{
		if (!_this.scene) return;
		var scene=_this.scene;
		i=scene.children.length;
		while (i--)
		{ 
			if (scene.children[i].type==='Mesh')
				scene.remove(scene.children[i]);
		}
		
		_this.camera.position.set(_this.camerax,_this.cameray,_this.cameraz);
		
		_this.models=new Array();
		_this.models_count=0;
		_this.models_ref=new Array();
		_this.max_model_id=0;
		_this.load_status=new Array();
		_this.load_session=0;
		_this.loaded_models_arr=new Array();
		_this.animation=new Array();
	}
	
	this.reset_parent_element=function(parent_element_obj)
	{
		_this.parent_element=parent_element_obj;
		if (_this.allow_drag_and_drop)
			_this.set_drag_and_drop(true);
			
		_this.set_on_model_mousedown(_this.onmousedown_callback);
		
		_this.parent_element.appendChild(_this.renderer.domElement);
	}
	
	this.scripts_loader=null;
	this.external_files_loaded = function()
	{
		_this.ready=true;
		_this.init();
		if (_this.ready_callback)
			_this.ready_callback();
	}

	this.load_three=function(path)
	{
		if (typeof _this.load_three_files != "string") _this.load_three_files="";
		_this.scripts_loader=new ScriptsLoader();
		//_this.scripts_loader.load_scripts(new Array(path+"three.min.js", path+"webgl_detector.js", path+"Projector.js", path+"CanvasRenderer.js", path+"OrbitControls.js"), _this.external_files_loaded);
		//_this.scripts_loader.load_scripts(new Array(path+"three.min.js", path+"webgl_detector.js", path+"Projector.js", path+"CanvasRenderer.js", path+"TrackballControls.js"), _this.external_files_loaded);
		_this.scripts_loader.load_scripts(new Array(path+"three.min.js", path+"webgl_detector.js", path+"Projector.js", path+"CanvasRenderer.js", path+(_this.controls_type==0?"OrbitControls.js":"TrackballControls.js")), _this.external_files_loaded);
	}
	
	this.init_by_json = function(json_str)
	{
		var data=null;
		try
		{
			data=JSON.parse(json_str);
		}
		catch(err)
		{
			console.log('json error ', json_str);
			return false;
		}
	
		_this.options=data;
		
		_this.set_options();
		
		if (_this.ready)
			_this.init();
	}
	
	//constructor
	_this.set_options();
	
	//init if ready
	if (_this.ready)
	{
		_this.init();
		if (_this.ready_callback)
			_this.ready_callback();
	}
	else
	{
		if (!(_this.load_three_files===false))
		{
			//we'll load THREE files by ourselves
			_this.load_three(_this.load_three_files);
		}
		else
			_this.model_error("No THREE files were loaded");
	}

}



function ScriptsLoader()
{
	var _this=this;
	this.all_loaded_callback=null;
	
	this.scripts_to_load=new Array(); //files in before loading, key=just an index (number)
	this.loading_scripts=new Array(); //loading in progress, key=script name
	this.loaded_scripts=new Array(); //done loading, key=script name

	//returns wheter all scripts in array are loaded
	this.scripts_are_loaded=function(scripts_arr)
	{
		var keys=Object.keys(scripts_arr);
		
		i=keys.length;
		
		while (i--)
		{
			if (!_this.loaded_scripts[_this.get_full_name(scripts_arr[i])])
				return false;
		}
		
		return true;
	}

	//get url with domain and such
	this.get_short_name=function (s)
	{
		if (!s) return '';
		return s.substring(s.lastIndexOf("/") + 1);
	}

	this.load_scripts = function (scripts_arr, all_loaded_callback)
	{
		if (all_loaded_callback) _this.all_loaded_callback=all_loaded_callback;
		Object.keys(scripts_arr).forEach(function(key)
		{
			//var curr_script_name=_this.get_full_name(scripts_arr[key]);
			var curr_script_name=_this.get_short_name(scripts_arr[key]);
			if (_this.scripts_to_load.indexOf(curr_script_name)==-1)
				if (!_this.loading_scripts[curr_script_name])
					if (!_this.loaded_scripts[curr_script_name])
						_this.scripts_to_load.push(scripts_arr[key]);
		});
		_this.load_files();
	}

	this.load_files = function()
	{
		if (_this.scripts_to_load.length==0)
		{
			if (_this.all_loaded_callback) _this.all_loaded_callback();
			return;
		}
		
		while (_this.scripts_to_load.length)
		{
			var script_name=_this.scripts_to_load.shift();
			if (!_this.loading_scripts[script_name])
			{
				_this.loading_scripts[script_name]=1;
					
				var script = document.createElement('script');
				script.onload = function ()
				{
					//console.log(_this.scripts_to_load);
					var curr_script_name=_this.get_short_name(script.src);
					//console.log(script.src+" - > "+curr_script_name);
					_this.loaded_scripts[curr_script_name]=1;
					_this.loading_scripts[curr_script_name]=0;
					
					_this.load_files(); //load next file, if any
				};
				script.src=script_name;
				document.head.appendChild(script); 
				return;
			}
		}
		
	}
}

Number.isInteger = Number.isInteger || function(value)
{
	return typeof value === "number" && 
		isFinite(value) && 
		Math.floor(value) === value;
};

init = function()
{
	if (!!window.MSStream) return; //IE
	var script_path=document.currentScript.attributes['src'].value;
	var x=script_path.lastIndexOf('/');
	stl_viewer_script_path = x > 0 ? script_path.substring(0, x+1) : "";
}();