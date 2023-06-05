/** 
 * use javascript implement DBSCAN with https://en.wikipedia.org/wiki/DBSCAN
 * @params {double} eps
 * @params {int} min_point
 * @params {string} distance
 * @params {array/object} data note: dim should be 2, example [[]] or {1:{}}
 */ 
 class DBSCAN{
    constructor(eps=undefined, min_point=undefined, distance="Euclidean", data=undefined){
        this.allow_distance = ["Euclidean"];
        this.eps(eps);
        this.min_point(min_point);
        this.distance(distance);
        this.data(data);
    }

    eps(eps){
        if (typeof(eps) === "undefined" || typeof(eps) === "number"){
            this._eps = eps;
            return this;
        }else{
            throw "eps should pass number";
        }
    }

    min_point(min_point){
        if (typeof(min_point) === "undefined" || typeof(min_point) === "number"){
            this._min_point = min_point;
            return this;
        }else{
            throw "min_point should pass number";
        }
    }

    distance(distance){
        if (typeof(distance) === "undefined" || typeof(distance) === "string" || this.allow_distance.indexOf(distance) >= 0){
            if (typeof(distance) != "undefined"){
                if (this.allow_distance.indexOf(distance) === 0){
                    this._distance = this.euclidean;
                }
                return this;
            }
        }else{
            throw `distance should pass [${this.allow_distance}]`;
        }
    }

    set_distance_function(distance_function){
        this._distance = distance_function;
        return this;
    }

    data(data){
        if (typeof(data) === "undefined" || data.constructor.name === "Array" || data.constructor.name === "Object"){
            if (typeof(data) != "undefined"){
                let length_count = 0;
                for (let i in data){
                    if (data[i].constructor.name != "Array" && data[i].constructor.name != "Object"){
                        throw "data should is 2-dim array or object";
                    }
                    length_count++;
                    // note: should check all array element length be same.
                    break;
                }
                
                if (length_count === 0){
                    throw "data should have element";
                }

                this._data = new Array();

                for (let i in data){
                    this._data.push(new dbscan_struct(data[i]));
                }
            }
            
            return this;
        }else{
            throw "data should pass array";
        }
    }

    fit(data=undefined){
        if (typeof(data) != "undefined"){
            this.data(data);
        }

        if (this._eps === undefined){
            throw "miss pass eps";
        }else if (this._min_point === undefined){
            throw "miss pass min_point";
        }
        else if (this._distance === undefined){
            throw "miss pass distance";
        }else if (this._data === undefined){
            throw "miss pass data";
        }

        let cluster_number = 1;
        //implement dbscan algorithm
        for (let i in this._data){
            if (this._data[i].label != undefined){
                continue;
            }

            let neighbors = this._get_neighbors(i);
            if (neighbors.length < this._min_point){
                this._data[i].label = "noise";
                continue;
            }

            this._data[i].label = cluster_number;
            for (let j in neighbors){
                if (this._data[neighbors[j]].label == "noise"){
                    this._data[neighbors[j]].label = cluster_number;
                }
                if (this._data[neighbors[j]].label != undefined){
                    continue;
                }
                this._data[neighbors[j]].label = cluster_number;
                let temp_neighbors = this._get_neighbors(neighbors[j]);
                if (temp_neighbors.length >= this._min_point){
                    neighbors.concat(temp_neighbors);
                }
            }
            cluster_number++;
        }

        return this._get_result();
    }

    _get_result(){
        let result = new Object();
        for (let i in this._data){
            let label = this._data[i].label;
            let vector = this._data[i].vector;

            if (!(label in result)){
                result[label] = new Array();
            }
            result[label].push(vector);
        }
        return result;
    }

    _get_neighbors(index){
        let neighbors = new Array();
        for (let i in this._data){
            if (i != index && this._distance(this._data[i].vector, this._data[index].vector) <= this._eps){
                neighbors.push(i);
            }
        }
        return neighbors;
    }

    euclidean(v1, v2){
        let sum = 0;
        for (let i in v1){
            sum += Math.pow(v1[i] - v2[i], 2);
        }
        return Math.sqrt(sum);
    }
}


class dbscan_struct{
    constructor(vector){
        this.vector = vector;
        this.label = undefined;
    }
}