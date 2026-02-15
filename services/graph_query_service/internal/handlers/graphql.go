package handlers

import (
	"net/http"

	"github.com/chifamba/dzinza/services/graph_query_service/internal/models"
	"github.com/chifamba/dzinza/services/graph_query_service/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/graphql-go/graphql"
)

type GraphQLHandler struct {
	svc    service.GraphQueryService
	schema graphql.Schema
}

func NewGraphQLHandler(svc service.GraphQueryService) (*GraphQLHandler, error) {
	h := &GraphQLHandler{svc: svc}
	
	schema, err := h.createSchema()
	if err != nil {
		return nil, err
	}
	h.schema = schema
	
	return h, nil
}

func (h *GraphQLHandler) createSchema() (graphql.Schema, error) {
	personType := graphql.NewObject(graphql.ObjectConfig{
		Name: "Person",
		Fields: graphql.Fields{
			"id": &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
			"given_name": &graphql.Field{
				Type: graphql.NewNonNull(graphql.String),
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					if person, ok := p.Source.(*models.Person); ok {
						return person.PrimaryName.GivenName, nil
					}
					return nil, nil
				},
			},
			"surname": &graphql.Field{
				Type: graphql.NewNonNull(graphql.String),
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					if person, ok := p.Source.(*models.Person); ok {
						return person.PrimaryName.Surname, nil
					}
					return nil, nil
				},
			},
			"gender":            &graphql.Field{Type: graphql.String},
			"birth_date_string": &graphql.Field{Type: graphql.String},
			"birth_place":       &graphql.Field{Type: graphql.String},
			"is_living":         &graphql.Field{Type: graphql.Boolean},
			"biography":         &graphql.Field{Type: graphql.String},
			"clan":              &graphql.Field{Type: graphql.String},
			"tribe":             &graphql.Field{Type: graphql.String},
			"tree_id":           &graphql.Field{Type: graphql.ID},
		},
	})

	// Add self-referential fields
	personType.AddFieldConfig("parents", &graphql.Field{
		Type: graphql.NewList(personType),
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			person := p.Source.(*models.Person)
			return h.svc.GetParents(p.Context, person.ID.String())
		},
	})
	personType.AddFieldConfig("children", &graphql.Field{
		Type: graphql.NewList(personType),
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			person := p.Source.(*models.Person)
			return h.svc.GetChildren(p.Context, person.ID.String())
		},
	})
	personType.AddFieldConfig("spouses", &graphql.Field{
		Type: graphql.NewList(personType),
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			person := p.Source.(*models.Person)
			return h.svc.GetSpouses(p.Context, person.ID.String())
		},
	})
	personType.AddFieldConfig("siblings", &graphql.Field{
		Type: graphql.NewList(personType),
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			person := p.Source.(*models.Person)
			return h.svc.GetSiblings(p.Context, person.ID.String())
		},
	})

	treeType := graphql.NewObject(graphql.ObjectConfig{
		Name: "FamilyTree",
		Fields: graphql.Fields{
			"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
			"name":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
			"description": &graphql.Field{Type: graphql.String},
			"owner_id":    &graphql.Field{Type: graphql.ID},
		},
	})

	rootQuery := graphql.NewObject(graphql.ObjectConfig{
		Name: "RootQuery",
		Fields: graphql.Fields{
			"person": &graphql.Field{
				Type: personType,
				Args: graphql.FieldConfigArgument{
					"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					id := p.Args["id"].(string)
					return h.svc.GetPerson(p.Context, id)
				},
			},
			"tree": &graphql.Field{
				Type: treeType,
				Args: graphql.FieldConfigArgument{
					"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					id := p.Args["id"].(string)
					return h.svc.GetTree(p.Context, id)
				},
			},
			"searchPersons": &graphql.Field{
				Type: graphql.NewList(personType),
				Args: graphql.FieldConfigArgument{
					"name":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
					"limit": &graphql.ArgumentConfig{Type: graphql.Int},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					name := p.Args["name"].(string)
					limit, ok := p.Args["limit"].(int)
					if !ok {
						limit = 10
					}
					return h.svc.SearchPersons(p.Context, name, limit)
				},
			},
		},
	})

	return graphql.NewSchema(graphql.SchemaConfig{
		Query: rootQuery,
	})
}

func (h *GraphQLHandler) Handle(c *gin.Context) {
	var params struct {
		Query         string                 `json:"query"`
		OperationName string                 `json:"operationName"`
		Variables     map[string]interface{} `json:"variables"`
	}

	if err := c.ShouldBindJSON(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	result := graphql.Do(graphql.Params{
		Context:        c.Request.Context(),
		Schema:         h.schema,
		RequestString:  params.Query,
		VariableValues: params.Variables,
		OperationName:  params.OperationName,
	})

	c.JSON(http.StatusOK, result)
}
