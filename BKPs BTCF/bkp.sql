--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2025-08-06 22:26:38

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 227 (class 1259 OID 41176)
-- Name: categorias_usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorias_usuario (
    chave integer NOT NULL,
    chaveusuario integer NOT NULL,
    nome_categoria character varying(255) NOT NULL,
    tipo_transacao character varying(50) NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT categorias_usuario_tipo_transacao_check CHECK (((tipo_transacao)::text = ANY ((ARRAY['entrada'::character varying, 'saida'::character varying])::text[])))
);


ALTER TABLE public.categorias_usuario OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 41175)
-- Name: categorias_usuario_chave_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categorias_usuario_chave_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categorias_usuario_chave_seq OWNER TO postgres;

--
-- TOC entry 4963 (class 0 OID 0)
-- Dependencies: 226
-- Name: categorias_usuario_chave_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categorias_usuario_chave_seq OWNED BY public.categorias_usuario.chave;


--
-- TOC entry 223 (class 1259 OID 16427)
-- Name: entrada; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entrada (
    chave integer NOT NULL,
    tipo character varying(50) NOT NULL,
    valor numeric(10,2) NOT NULL,
    descricao text,
    datacad timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    qtdeparc integer,
    valorparc numeric(10,2),
    datafimparc date,
    chavepessoa integer,
    chavegrupo integer,
    categoria character varying(255),
    taxajuros numeric(5,2)
);


ALTER TABLE public.entrada OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16426)
-- Name: entrada_chave_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.entrada_chave_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.entrada_chave_seq OWNER TO postgres;

--
-- TOC entry 4964 (class 0 OID 0)
-- Dependencies: 222
-- Name: entrada_chave_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.entrada_chave_seq OWNED BY public.entrada.chave;


--
-- TOC entry 220 (class 1259 OID 16395)
-- Name: grupo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grupo (
    chave integer NOT NULL,
    nome character varying(100) NOT NULL,
    descricao text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    chaveusuariocriou integer
);


ALTER TABLE public.grupo OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16394)
-- Name: grupo_chave_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grupo_chave_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.grupo_chave_seq OWNER TO postgres;

--
-- TOC entry 4965 (class 0 OID 0)
-- Dependencies: 219
-- Name: grupo_chave_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grupo_chave_seq OWNED BY public.grupo.chave;


--
-- TOC entry 221 (class 1259 OID 16410)
-- Name: pessoasgrupo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pessoasgrupo (
    chaveusuario integer NOT NULL,
    chavegrupo integer NOT NULL,
    lider boolean DEFAULT false
);


ALTER TABLE public.pessoasgrupo OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16447)
-- Name: saida; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.saida (
    chave integer NOT NULL,
    tipo character varying(50) NOT NULL,
    valor numeric(10,2) NOT NULL,
    descricao text,
    datacad timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    qtdeparc integer,
    valorparc numeric(10,2),
    datafimparc date,
    chavepessoa integer,
    chavegrupo integer,
    categoria character varying(255)
);


ALTER TABLE public.saida OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16446)
-- Name: saida_chave_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.saida_chave_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.saida_chave_seq OWNER TO postgres;

--
-- TOC entry 4966 (class 0 OID 0)
-- Dependencies: 224
-- Name: saida_chave_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.saida_chave_seq OWNED BY public.saida.chave;


--
-- TOC entry 218 (class 1259 OID 16386)
-- Name: usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario (
    chave integer NOT NULL,
    nome character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    senha character varying(100) NOT NULL
);


ALTER TABLE public.usuario OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16385)
-- Name: usuario_chave_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuario_chave_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuario_chave_seq OWNER TO postgres;

--
-- TOC entry 4967 (class 0 OID 0)
-- Dependencies: 217
-- Name: usuario_chave_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuario_chave_seq OWNED BY public.usuario.chave;


--
-- TOC entry 4775 (class 2604 OID 41179)
-- Name: categorias_usuario chave; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias_usuario ALTER COLUMN chave SET DEFAULT nextval('public.categorias_usuario_chave_seq'::regclass);


--
-- TOC entry 4771 (class 2604 OID 16430)
-- Name: entrada chave; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entrada ALTER COLUMN chave SET DEFAULT nextval('public.entrada_chave_seq'::regclass);


--
-- TOC entry 4767 (class 2604 OID 16398)
-- Name: grupo chave; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupo ALTER COLUMN chave SET DEFAULT nextval('public.grupo_chave_seq'::regclass);


--
-- TOC entry 4773 (class 2604 OID 16450)
-- Name: saida chave; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saida ALTER COLUMN chave SET DEFAULT nextval('public.saida_chave_seq'::regclass);


--
-- TOC entry 4766 (class 2604 OID 16389)
-- Name: usuario chave; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario ALTER COLUMN chave SET DEFAULT nextval('public.usuario_chave_seq'::regclass);


--
-- TOC entry 4791 (class 2606 OID 41183)
-- Name: categorias_usuario categorias_usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias_usuario
    ADD CONSTRAINT categorias_usuario_pkey PRIMARY KEY (chave);


--
-- TOC entry 4787 (class 2606 OID 16435)
-- Name: entrada entrada_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entrada
    ADD CONSTRAINT entrada_pkey PRIMARY KEY (chave);


--
-- TOC entry 4783 (class 2606 OID 16404)
-- Name: grupo grupo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupo
    ADD CONSTRAINT grupo_pkey PRIMARY KEY (chave);


--
-- TOC entry 4785 (class 2606 OID 16415)
-- Name: pessoasgrupo pessoasgrupo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pessoasgrupo
    ADD CONSTRAINT pessoasgrupo_pkey PRIMARY KEY (chaveusuario, chavegrupo);


--
-- TOC entry 4789 (class 2606 OID 16455)
-- Name: saida saida_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saida
    ADD CONSTRAINT saida_pkey PRIMARY KEY (chave);


--
-- TOC entry 4793 (class 2606 OID 41185)
-- Name: categorias_usuario uk_categoria_usuario_tipo; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias_usuario
    ADD CONSTRAINT uk_categoria_usuario_tipo UNIQUE (chaveusuario, nome_categoria, tipo_transacao);


--
-- TOC entry 4779 (class 2606 OID 16393)
-- Name: usuario usuario_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_email_key UNIQUE (email);


--
-- TOC entry 4781 (class 2606 OID 16391)
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (chave);


--
-- TOC entry 4797 (class 2606 OID 16441)
-- Name: entrada entrada_chavegrupo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entrada
    ADD CONSTRAINT entrada_chavegrupo_fkey FOREIGN KEY (chavegrupo) REFERENCES public.grupo(chave) ON DELETE CASCADE;


--
-- TOC entry 4798 (class 2606 OID 16436)
-- Name: entrada entrada_chavepessoa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entrada
    ADD CONSTRAINT entrada_chavepessoa_fkey FOREIGN KEY (chavepessoa) REFERENCES public.usuario(chave) ON DELETE CASCADE;


--
-- TOC entry 4801 (class 2606 OID 41186)
-- Name: categorias_usuario fk_usuario; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias_usuario
    ADD CONSTRAINT fk_usuario FOREIGN KEY (chaveusuario) REFERENCES public.usuario(chave) ON DELETE CASCADE;


--
-- TOC entry 4794 (class 2606 OID 16405)
-- Name: grupo grupo_chaveusuariocriou_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupo
    ADD CONSTRAINT grupo_chaveusuariocriou_fkey FOREIGN KEY (chaveusuariocriou) REFERENCES public.usuario(chave) ON DELETE CASCADE;


--
-- TOC entry 4795 (class 2606 OID 16421)
-- Name: pessoasgrupo pessoasgrupo_chavegrupo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pessoasgrupo
    ADD CONSTRAINT pessoasgrupo_chavegrupo_fkey FOREIGN KEY (chavegrupo) REFERENCES public.grupo(chave) ON DELETE CASCADE;


--
-- TOC entry 4796 (class 2606 OID 16416)
-- Name: pessoasgrupo pessoasgrupo_chaveusuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pessoasgrupo
    ADD CONSTRAINT pessoasgrupo_chaveusuario_fkey FOREIGN KEY (chaveusuario) REFERENCES public.usuario(chave) ON DELETE CASCADE;


--
-- TOC entry 4799 (class 2606 OID 16461)
-- Name: saida saida_chavegrupo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saida
    ADD CONSTRAINT saida_chavegrupo_fkey FOREIGN KEY (chavegrupo) REFERENCES public.grupo(chave) ON DELETE CASCADE;


--
-- TOC entry 4800 (class 2606 OID 16456)
-- Name: saida saida_chavepessoa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saida
    ADD CONSTRAINT saida_chavepessoa_fkey FOREIGN KEY (chavepessoa) REFERENCES public.usuario(chave) ON DELETE CASCADE;


-- Completed on 2025-08-06 22:26:38

--
-- PostgreSQL database dump complete
--

