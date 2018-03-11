
const {log, biglog, errorlog, colorize} = require("./out");

const Sequelize = require('sequelize');

const {models} = require('./model');


/**
 * Muestra la ayuda.
 */
exports.helpCmd = rl => {
    log("Comandos:");
    log('h|help - Muestra esta ayuda.');
    log('list - Listar los quizes existentes.');
    log('show <id> - Muestra la pregunta y la respuesta del quiz indicado');
    log('add - Añadir un nuevo quiz interactivamente.');
    log('delete <id> - Borrar el quiz indicado.');
    log('edit <id> - Editar el quiz indicado.');
    log('test <id> - Probar el quiz indicado.');
    log('p|play - Jugar a preguntar aleatoriamente todos los quizes.');
    log('credits - Créditos.');
    log('q|quit - Salir del programa');
    rl.prompt();
};
/**
 * Terminar el programa.
 */
exports.quitCmd = rl => {
    rl.close();
    rl.prompt();
};

/**
 * Lista todos los quizes existentes en el modelo. 
 */
exports.listCmd = rl => {

    models.quiz.findAll()
    .each(quiz => {
            log(` [${colorize(quiz.id, 'magenta')}]:  ${quiz.question}`);
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};


const makeQuestion = (rl,text) => {
    
    return new Sequelize.Promise((resolve, reject) => {
        rl.question(colorize(text, 'red'), answer => {
            resolve(answer.trim());
        });
    });
};   


/**
 * Añade un nuevo quiz al modelo.
 * Pregunta interactivamente por la pregunta y por la respuesta.
 */
exports.addCmd = rl => {
    makeQuestion(rl, 'Introduzca una pregunta: ')
    .then(q => {
        return makeQuestion(rl, 'Introduzca la respuesta ')
        .then(a => {
            return {question: q, answer: a};
        });
    })
    .then(quiz => {
        return models.quiz.create(quiz);
    })
    .then((quiz) => {
        log(` ${colorize('Se ha añadido','magenta')}: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog('El quiz es erroneo:');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};



const validateId = id => {
    
    return new Sequelize.Promise((resolve,reject) => {
        if (typeof id === "undefined") {
            reject(new Error(`Falta el parametro <id>.`));
        } else {
            id = parseInt(id);
            if (Number.isNaN(id)) {
                reject( new Error(`El valor del parametro <id< no es un numero`));
            } else {
                resolve(id);
            }
        }
    });
};




/**
 * Muestra el quiz indicado en el parámetro: la pregunta y la respuesta
 *
 * @param id Clave
 */
exports.showCmd = (rl,id) => {

    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if (!quiz) {
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }
        log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};
/**
* Permite probar el quiz indicado.
*/
exports.testCmd = (rl,id) =>{
    
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if (!quiz) {
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }
        log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
        return makeQuestion(rl, ' Introduzca la respuesta: ')
        .then(a => {
            if(quiz.answer.toUpperCase() === a.toUpperCase().trim()){
                log("Su respuesta es correcta");
                biglog('Correcta', 'green');
            } else{
                log("Su respuesta es incorrecta");
                biglog('Incorrecta', 'red');
            }
        });
        
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};
/**
 * Borra el quiz del modelo
 *
 * @param id Clave
 */
exports.deleteCmd = (rl,id)=> {
    
    validateId(id)
    .then(id => models.quiz.destroy({where: {id}}))
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};

/**
 * Edita un quiz del modelo
 *
 * @param id Clave
 */
exports.editCmd = (rl,id)=> {
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if(!quiz) {
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }
        
        process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);
        return makeQuestion(rl, ' Introduzca la pregunta: ')
        .then(q => {
            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)},0);
            return makeQuestion(rl, ' Introduzca la respuesta ')
            .then(a => {
                quiz.question = q;
                quiz.answer = a;
                return quiz;
            });
        });
    })
    .then(quiz => {
        return quiz.save();
    })
    .then(quiz => {
        log(`Se ha cambiado el quiz ${colorize(id,'magenta')} por: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog('El quiz es erroneo:');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};

/**
 * Muestra los nombres de los autores de la práctica.
 */
exports.creditsCmd = rl => {
    log('Autor de la práctica:',"green");
   	log("Sergio Framiñán García","green");
   	rl.prompt();
};

/**
*Pregunta todos los quizes existentes en el modelo en orden aleatorio.
*Se gana si se contesta a todos satisfactoriamente.
*/
exports.playCmd = rl => {
/*	
    let score = 0;
    let toBeResolved = [];
    let total = model.count();
    //log(`${prueba}`, "red");   
    for (var i = 0; i < model.count(); i++) {
        toBeResolved[i]=i;
        //log(`${i}`, "red"); 
    };
const aleatorio = () => {
    id = Math.floor(Math.random()*toBeResolved.length);
}

const playOne = () => {

    if (toBeResolved.length === 0){
        log("No hay más preguntas que responder", "red");
        rl.prompt();
    
    }else{

        aleatorio();

        while(toBeResolved[id]==="a"){
            aleatorio();
        }

        //let id = Math.floor(Math.random()*toBeResolved.length);
        let quiz = model.getByIndex(id);


        toBeResolved.splice(id,1,"a");
        
            rl.question(`${colorize(quiz.question, 'red')} `, question => {
                
                if(question.toUpperCase() === quiz.answer.toUpperCase()){
                    score+=1;
                    total-=1;

                    if(total === 0){
                        log(`No hay nada más que preguntar\nFin del juego. Aciertos: ${score}`);
                        biglog(`${score}`, "magenta");
                    }else{
                            log(`CORRECTO - Lleva ${score} aciertos`);
                            playOne();
                        };
                }else{
                    log(`INCORRECTO\nFin del juego. Aciertos: ${score}`);
                    biglog(`${score}`, 'red');
                }
                rl.prompt();
            });
        };

}
playOne();
*/
    let score = 0;
    let toBeResolved = [];
    

    const playOne = () => {
        return new Promise((resolve,reject) => {
            
            if(toBeResolved.length <=0){
                console.log("No hay nada mas que preguntar.\nFin del examen. Aciertos:");
                resolve();
                return;
            }
            let id = Math.floor(Math.random()*toBeResolved.length);
            let quiz = toBeResolved[id];
            toBeResolved.splice(id,1);
            
            makeQuestion(rl, quiz.question+'? ')
            .then(answer => {
                if(answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim()){
                    score++;
                    console.log("CORRECTO - Lleva ",score, "aciertos");
                    resolve(playOne());
                } else {
                    console.log("INCORRECTO.\nFin del examen. Aciertos:");
                    resolve();
                }   
            })
        })
    }
    
    models.quiz.findAll({raw: true})
    .then(quizzes => {
        toBeResolved = quizzes;
    })
    .then(() => {
        return playOne();
    })
    .catch(error => {
        console.log(error);
    })
    .then(() => {
        biglog(score,'magenta');
        rl.prompt();
    })
};
